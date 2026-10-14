// Rule-based insights (no AI). Pure functions on integer cents; the UI turns
// each result into one plain-language sentence with a concrete number.

import { addMonths } from "./dates";
import { normalizeDescription } from "./import/dedupe";
import { guessMerchant } from "./import/german";
import { classify, expensesByCategory, type CategoryKind, type SummaryTx } from "./summary";

export type InsightTx = SummaryTx & { merchant: string | null; description: string };

// ---------------------------------------------------------------- month over month

export type CategoryIncrease = {
  category_id: string | null;
  current: number;
  previous: number;
  diff: number;
  /** null when there was no spending last month */
  pct: number | null;
};

const MIN_INCREASE_CENTS = 1000; // ignore changes under 10 €
const MIN_INCREASE_PCT = 10;

/** Top `limit` categories whose spending grew most vs the previous month. */
export function topCategoryIncreases(
  txs: readonly InsightTx[],
  kinds: ReadonlyMap<string, CategoryKind>,
  month: string,
  limit = 3,
): CategoryIncrease[] {
  const prevMonth = addMonths(month, -1);
  const current = expensesByCategory(txs.filter((t) => t.date.startsWith(month)), kinds);
  const previous = new Map(
    expensesByCategory(txs.filter((t) => t.date.startsWith(prevMonth)), kinds).map((r) => [r.category_id, r.cents]),
  );
  return current
    .map((r) => {
      const prev = previous.get(r.category_id) ?? 0;
      const diff = r.cents - prev;
      return {
        category_id: r.category_id,
        current: r.cents,
        previous: prev,
        diff,
        pct: prev > 0 ? Math.round((diff / prev) * 100) : null,
      };
    })
    .filter((r) => r.diff >= MIN_INCREASE_CENTS && (r.pct === null || r.pct >= MIN_INCREASE_PCT))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, limit);
}

// ---------------------------------------------------------------- merchants

/** Grouping key for a payee: first two normalised words of the merchant (or a guess from the description). */
export function payeeKey(tx: Pick<InsightTx, "merchant" | "description">): string | null {
  const name = tx.merchant || guessMerchant(tx.description);
  if (!name) return null;
  const key = normalizeDescription(name).split(" ").filter(Boolean).slice(0, 2).join(" ");
  return key || null;
}

export type TopMerchant = { key: string; name: string; cents: number; count: number };

/** Payees with the highest spending in the given transactions. */
export function topMerchants(
  txs: readonly InsightTx[],
  kinds: ReadonlyMap<string, CategoryKind>,
  limit = 3,
): TopMerchant[] {
  const map = new Map<string, TopMerchant>();
  for (const tx of txs) {
    if (classify(tx, kinds) !== "expense") continue;
    const key = payeeKey(tx);
    if (!key) continue;
    const entry = map.get(key) ?? { key, name: tx.merchant || guessMerchant(tx.description) || key, cents: 0, count: 0 };
    entry.cents -= tx.amount_cents;
    entry.count++;
    map.set(key, entry);
  }
  return [...map.values()]
    .filter((m) => m.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .slice(0, limit);
}

// ---------------------------------------------------------------- recurring payments

export type RecurringPayment = {
  key: string;
  name: string;
  /** Typical monthly amount (positive cents). */
  monthly: number;
  yearly: number;
  occurrences: number;
  lastDate: string;
};

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Same payee, similar amount, roughly monthly: ≥3 payments, median gap 25–35
 * days, the latest 3 amounts within ±10 % (min. 1 €) of the newest, and the
 * last one no more than 45 days before `asOf` (still active).
 */
export function detectRecurring(
  txs: readonly InsightTx[],
  kinds: ReadonlyMap<string, CategoryKind>,
  asOf: string,
): RecurringPayment[] {
  const groups = new Map<string, InsightTx[]>();
  for (const tx of txs) {
    if (tx.date > asOf || tx.amount_cents >= 0) continue;
    if (classify(tx, kinds) !== "expense") continue;
    const key = payeeKey(tx);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }

  const out: RecurringPayment[] = [];
  for (const [key, list] of groups) {
    if (list.length < 3) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    const gaps = list.slice(1).map((tx, i) => daysBetween(list[i].date, tx.date));
    const gap = median(gaps);
    if (gap < 25 || gap > 35) continue;

    const latest = list[list.length - 1];
    const amount = -latest.amount_cents;
    const tolerance = Math.max(amount * 0.1, 100);
    if (!list.slice(-3).every((tx) => Math.abs(-tx.amount_cents - amount) <= tolerance)) continue;
    if (daysBetween(latest.date, asOf) > 45) continue;

    out.push({
      key,
      name: latest.merchant || guessMerchant(latest.description) || key,
      monthly: amount,
      yearly: amount * 12,
      occurrences: list.length,
      lastDate: latest.date,
    });
  }
  return out.sort((a, b) => b.monthly - a.monthly);
}

// ---------------------------------------------------------------- budgets

export type BudgetStatus = {
  category_id: string;
  limit: number;
  spent: number;
  /** spent / limit, 0..∞ */
  ratio: number;
  status: "over" | "near";
};

/** Budgets that are exceeded, or ≥ 90 % used. */
export function budgetWarnings(
  budgets: readonly { category_id: string; limit_cents: number; spent_cents: number }[],
): BudgetStatus[] {
  return budgets
    .map((b) => ({
      category_id: b.category_id,
      limit: b.limit_cents,
      spent: b.spent_cents,
      ratio: b.limit_cents ? b.spent_cents / b.limit_cents : 0,
    }))
    .filter((b) => b.ratio >= 0.9)
    .map((b) => ({ ...b, status: b.ratio > 1 ? ("over" as const) : ("near" as const) }))
    .sort((a, b) => b.ratio - a.ratio);
}
