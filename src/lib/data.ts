import "server-only";
import { createClient } from "./supabase/server";
import { monthStart, nextMonthStart } from "./dates";
import { toCents } from "./money";
import type { Tables } from "./supabase/database.types";
import type { InsightTx } from "./insights";
import type { SummaryTx } from "./summary";
import { NO_CATEGORY, PAGE_SIZE, type TxFilters } from "./transaction-filters";

// Server-side reads. RLS limits every query to the signed-in user.
// Amounts leave this module as integer cents (`*_cents`).

export type Category = Tables<"categories">;
export type Account = Tables<"accounts">;

export type Goal = Omit<Tables<"savings_goals">, "target"> & {
  target_cents: number;
  saved_cents: number;
};

export type Transaction = Omit<Tables<"transactions">, "amount" | "original_amount"> & {
  /** EUR (base currency). */
  amount_cents: number;
  /** In `currency`; null for EUR transactions. */
  original_cents: number | null;
};

export type Budget = Omit<Tables<"budgets">, "limit_amount"> & {
  limit_cents: number;
  spent_cents: number;
};

function toTransaction(row: Tables<"transactions">): Transaction {
  const { amount, original_amount, ...rest } = row;
  return {
    ...rest,
    amount_cents: toCents(amount),
    original_cents: original_amount === null ? null : toCents(original_amount),
  };
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("kind")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const [goals, deposits] = await Promise.all([
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase
      .from("transactions")
      .select("savings_goal_id, amount")
      .not("savings_goal_id", "is", null),
  ]);
  if (goals.error) throw goals.error;
  if (deposits.error) throw deposits.error;

  // Deposits are negative (money leaves the account), so saved = −sum.
  const saved = new Map<string, number>();
  for (const d of deposits.data) {
    if (!d.savings_goal_id) continue;
    saved.set(d.savings_goal_id, (saved.get(d.savings_goal_id) ?? 0) - toCents(d.amount));
  }

  return goals.data.map(({ target, ...g }) => ({
    ...g,
    target_cents: toCents(target),
    saved_cents: saved.get(g.id) ?? 0,
  }));
}

export async function getRecentTransactions(limit = 100): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(toTransaction);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toTransaction(data) : null;
}

export async function getBudgets(month: string): Promise<Budget[]> {
  const supabase = await createClient();
  const [budgets, txs] = await Promise.all([
    supabase.from("budgets").select("*").eq("month", monthStart(month)),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("is_transfer", false)
      .gte("date", monthStart(month))
      .lt("date", nextMonthStart(month))
      .not("category_id", "is", null),
  ]);
  if (budgets.error) throw budgets.error;
  if (txs.error) throw txs.error;

  // Spending is negative; refunds in the same category reduce it.
  const spent = new Map<string, number>();
  for (const t of txs.data) {
    if (!t.category_id) continue;
    spent.set(t.category_id, (spent.get(t.category_id) ?? 0) - toCents(t.amount));
  }

  return budgets.data.map(({ limit_amount, ...b }) => ({
    ...b,
    limit_cents: toCents(limit_amount),
    spent_cents: Math.max(0, spent.get(b.category_id) ?? 0),
  }));
}

export type Rule = Tables<"category_rules">;

export async function getRules(): Promise<Rule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("category_rules").select("*");
  if (error) throw error;
  return data;
}

export type ImportBatch = Tables<"import_batches"> & { transaction_count: number };

/** Recent imports with how many of their transactions still exist. */
export async function getImportBatches(limit = 10): Promise<ImportBatch[]> {
  const supabase = await createClient();
  const { data: batches, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (batches.length === 0) return [];

  const { data: txs, error: txError } = await supabase
    .from("transactions")
    .select("import_batch_id")
    .in(
      "import_batch_id",
      batches.map((b) => b.id),
    );
  if (txError) throw txError;

  const counts = new Map<string, number>();
  for (const t of txs) {
    if (t.import_batch_id) counts.set(t.import_batch_id, (counts.get(t.import_batch_id) ?? 0) + 1);
  }
  return batches.map((b) => ({ ...b, transaction_count: counts.get(b.id) ?? 0 }));
}

// ---------------------------------------------------------------- filtered queries

/** Structural subset of the PostgREST builder used by applyFilters. */
interface Filterable<T> {
  or(filters: string): T;
  eq(column: string, value: unknown): T;
  gte(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
  lt(column: string, value: unknown): T;
  is(column: string, value: null | boolean): T;
}

/** PostgREST logic-tree value: quote it, drop characters that would break the syntax. */
function quoteValue(text: string) {
  return `"${text.replace(/["\\,()]/g, " ").trim()}"`;
}

function typeCondition(type: TxFilters["type"], categories: Category[]): string | null {
  if (!type || type === "transfer") return null;
  const ids = categories.filter((c) => c.kind === type).map((c) => c.id);
  const inIds = ids.length ? `category_id.in.(${ids.join(",")})` : null;
  // No savings categories → match nothing (id is never null).
  if (type === "savings") return inIds ?? "id.is.null";
  // Uncategorised rows count as income/expense by their sign.
  const bySign = `and(category_id.is.null,amount.${type === "income" ? "gt" : "lt"}.0)`;
  return inIds ? `${inIds},${bySign}` : bySign;
}

function applyFilters<T extends Filterable<T>>(query: T, f: TxFilters, categories: Category[]): T {
  let q = query;
  const orGroups: string[] = [];
  if (f.q) {
    const pattern = quoteValue(`*${f.q}*`);
    orGroups.push(`description.ilike.${pattern},merchant.ilike.${pattern},note.ilike.${pattern}`);
  }
  const typeGroup = typeCondition(f.type, categories);
  if (typeGroup) orGroups.push(typeGroup);
  // Several OR groups must all hold: and(or(...),or(...)).
  if (orGroups.length === 1) q = q.or(orGroups[0]);
  else if (orGroups.length > 1) q = q.or(`and(${orGroups.map((g) => `or(${g})`).join(",")})`);

  if (f.type === "transfer") q = q.is("is_transfer", true);
  else if (f.type) q = q.is("is_transfer", false);
  if (f.from) q = q.gte("date", f.from);
  if (f.to) q = q.lte("date", f.to);
  if (f.category === NO_CATEGORY) q = q.is("category_id", null);
  else if (f.category) q = q.eq("category_id", f.category);
  if (f.account) q = q.eq("account_id", f.account);
  return q;
}

export async function getTransactionsPage(f: TxFilters, categories: Category[]) {
  const supabase = await createClient();
  const start = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await applyFilters(
    supabase.from("transactions").select("*", { count: "exact" }),
    f,
    categories,
  )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  const total = count ?? 0;
  return {
    rows: data.map(toTransaction),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

const FETCH_CHUNK = 1000; // Supabase returns at most 1000 rows per request.

/** Minimal rows for totals/charts matching the filters, fetched in chunks. */
export async function getSummaryRows(f: TxFilters, categories: Category[]): Promise<SummaryTx[]> {
  const supabase = await createClient();
  const out: SummaryTx[] = [];
  for (let start = 0; ; start += FETCH_CHUNK) {
    const { data, error } = await applyFilters(
      supabase.from("transactions").select("id, date, amount, category_id, is_transfer"),
      f,
      categories,
    )
      .order("date")
      .order("id")
      .range(start, start + FETCH_CHUNK - 1);
    if (error) throw error;
    for (const r of data) {
      out.push({ date: r.date, amount_cents: toCents(r.amount), category_id: r.category_id, is_transfer: r.is_transfer });
    }
    if (data.length < FETCH_CHUNK) return out;
  }
}

/** Summary rows for a date range [from, to] (inclusive). */
export function getSummaryRowsBetween(from: string, to: string, categories: Category[]) {
  return getSummaryRows({ q: "", from, to, category: "", account: "", type: "", page: 1 }, categories);
}

export async function hasAnyTransactions(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("transactions").select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Full rows for CSV export, optionally limited to [from, to]; chunked past 1000 rows. */
export async function getTransactionsForExport(from?: string, to?: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const out: Transaction[] = [];
  for (let start = 0; ; start += FETCH_CHUNK) {
    let query = supabase.from("transactions").select("*");
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    const { data, error } = await query
      .order("date")
      .order("created_at")
      .range(start, start + FETCH_CHUNK - 1);
    if (error) throw error;
    out.push(...data.map(toTransaction));
    if (data.length < FETCH_CHUNK) return out;
  }
}

/** "YYYY-MM" of the newest transaction, or null when there are none. */
export async function getLatestTransactionMonth(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.date.slice(0, 7) : null;
}

/**
 * Month to show when the URL doesn't specify one: the current month, unless it
 * has no transactions yet — then the newest month that has data.
 */
export async function defaultMonth(current: string): Promise<string> {
  const latest = await getLatestTransactionMonth();
  return latest && latest < current ? latest : current;
}

/** Rows with payee info for insights, for [from, to] inclusive; chunked. */
export async function getInsightRowsBetween(from: string, to: string): Promise<InsightTx[]> {
  const supabase = await createClient();
  const out: InsightTx[] = [];
  for (let start = 0; ; start += FETCH_CHUNK) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, amount, category_id, is_transfer, merchant, description")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(start, start + FETCH_CHUNK - 1);
    if (error) throw error;
    for (const r of data) {
      out.push({
        date: r.date,
        amount_cents: toCents(r.amount),
        category_id: r.category_id,
        is_transfer: r.is_transfer,
        merchant: r.merchant,
        description: r.description,
      });
    }
    if (data.length < FETCH_CHUNK) return out;
  }
}

export type Debt = Omit<Tables<"debts">, "amount" | "monthly_payment"> & {
  amount_cents: number;
  monthly_cents: number | null;
  /** Sum of linked repayments (positive, EUR). */
  paid_cents: number;
  last_payment: string | null;
};

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const [debts, payments] = await Promise.all([
    supabase.from("debts").select("*").order("created_at"),
    supabase.from("transactions").select("debt_id, amount, date").not("debt_id", "is", null),
  ]);
  if (debts.error) throw debts.error;
  if (payments.error) throw payments.error;

  // Repayments are outflows (negative), so paid = −sum.
  const paid = new Map<string, { cents: number; last: string }>();
  for (const p of payments.data) {
    if (!p.debt_id) continue;
    const entry = paid.get(p.debt_id) ?? { cents: 0, last: "" };
    entry.cents -= toCents(p.amount);
    if (p.date > entry.last) entry.last = p.date;
    paid.set(p.debt_id, entry);
  }

  return debts.data.map(({ amount, monthly_payment, ...d }) => ({
    ...d,
    amount_cents: toCents(amount),
    monthly_cents: monthly_payment === null ? null : toCents(monthly_payment),
    paid_cents: Math.max(0, paid.get(d.id)?.cents ?? 0),
    last_payment: paid.get(d.id)?.last || null,
  }));
}
