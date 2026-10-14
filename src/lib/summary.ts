// Totals for dashboard, reports and insights. Pure functions on integer cents.
//
// Classification of a transaction (see also src/lib/transactions.ts):
//   is_transfer                → transfer (excluded from every total)
//   category kind "savings"    → savings  (deposit −50 € ⇒ +50 € saved)
//   category kind "income"     → income   (a negative one, e.g. a reversal, reduces income)
//   category kind "expense"    → expense  (a refund +10 € reduces spending)
//   no category                → income if amount > 0, else expense
//
// net = income − expenses − savings  (what is left on the accounts)

import { addMonths } from "./dates";

export type CategoryKind = "income" | "expense" | "savings";
export type TxClass = "income" | "expense" | "savings" | "transfer";

export type SummaryTx = {
  date: string;
  amount_cents: number;
  category_id: string | null;
  is_transfer: boolean;
};

export type Totals = { income: number; expenses: number; savings: number; net: number };

export function classify(tx: SummaryTx, kindById: ReadonlyMap<string, CategoryKind>): TxClass {
  if (tx.is_transfer) return "transfer";
  const kind = tx.category_id ? kindById.get(tx.category_id) : undefined;
  if (kind) return kind;
  return tx.amount_cents > 0 ? "income" : "expense";
}

export function totals(txs: readonly SummaryTx[], kindById: ReadonlyMap<string, CategoryKind>): Totals {
  let income = 0;
  let expenses = 0;
  let savings = 0;
  for (const tx of txs) {
    switch (classify(tx, kindById)) {
      case "income":
        income += tx.amount_cents;
        break;
      case "expense":
        expenses -= tx.amount_cents;
        break;
      case "savings":
        savings -= tx.amount_cents;
        break;
    }
  }
  return { income, expenses, savings, net: income - expenses - savings };
}

/** Spending per expense category (null = uncategorised), largest first. Refunds net out. */
export function expensesByCategory(
  txs: readonly SummaryTx[],
  kindById: ReadonlyMap<string, CategoryKind>,
): { category_id: string | null; cents: number; count: number }[] {
  const map = new Map<string | null, { cents: number; count: number }>();
  for (const tx of txs) {
    if (classify(tx, kindById) !== "expense") continue;
    const entry = map.get(tx.category_id) ?? { cents: 0, count: 0 };
    entry.cents -= tx.amount_cents;
    entry.count++;
    map.set(tx.category_id, entry);
  }
  return [...map]
    .map(([category_id, v]) => ({ category_id, ...v }))
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}

/** Per-category totals for any class (reports). Values are positive for the class's direction. */
export function byCategory(
  txs: readonly SummaryTx[],
  kindById: ReadonlyMap<string, CategoryKind>,
): { category_id: string | null; class: TxClass; cents: number; count: number }[] {
  const map = new Map<string, { category_id: string | null; class: TxClass; cents: number; count: number }>();
  for (const tx of txs) {
    const cls = classify(tx, kindById);
    if (cls === "transfer") continue;
    const key = `${cls}|${tx.category_id ?? ""}`;
    const entry = map.get(key) ?? { category_id: tx.category_id, class: cls, cents: 0, count: 0 };
    entry.cents += cls === "income" ? tx.amount_cents : -tx.amount_cents;
    entry.count++;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents);
}

/** Totals per month for `count` months ending with `lastMonth` ("YYYY-MM"), oldest first. */
export function monthlyTotals(
  txs: readonly SummaryTx[],
  kindById: ReadonlyMap<string, CategoryKind>,
  lastMonth: string,
  count: number,
): ({ month: string } & Totals)[] {
  const months = Array.from({ length: count }, (_, i) => addMonths(lastMonth, i - count + 1));
  const byMonth = new Map<string, SummaryTx[]>(months.map((m) => [m, []]));
  for (const tx of txs) byMonth.get(tx.date.slice(0, 7))?.push(tx);
  return months.map((month) => ({ month, ...totals(byMonth.get(month)!, kindById) }));
}

export function kindMap(categories: readonly { id: string; kind: CategoryKind }[]) {
  return new Map(categories.map((c) => [c.id, c.kind]));
}
