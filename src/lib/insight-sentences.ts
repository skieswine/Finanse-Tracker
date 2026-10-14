// Turns insight data into one plain-language sentence each (with a concrete number).

import {
  budgetWarnings,
  detectRecurring,
  topCategoryIncreases,
  topMerchants,
  uncategorizedSpending,
  type InsightTx,
} from "./insights";
import { fmt, type Dictionary } from "./i18n/types";
import { formatEUR } from "./money";
import { kindMap } from "./summary";
import { monthEnd, monthStart } from "./dates";
import { NO_CATEGORY, filtersToQuery } from "./transaction-filters";

export type Tone = "neutral" | "warning" | "critical";
export type Sentence = { text: string; tone: Tone; href?: string };

export type InsightSections = {
  changes: Sentence[];
  subscriptions: Sentence[];
  budgets: Sentence[];
  merchants: Sentence[];
  /** Section-level fallbacks when a list is empty. */
  empty: { changes: string; subscriptions: string; budgets: string; merchants: string };
};

type Input = {
  t: Dictionary;
  month: string;
  /** Last day to consider for "still active" subscriptions. */
  asOf: string;
  rows: InsightTx[];
  categories: { id: string; name: string; kind: "income" | "expense" | "savings" }[];
  budgets: { category_id: string; limit_cents: number; spent_cents: number }[];
};

export function buildInsights({ t, month, asOf, rows, categories, budgets }: Input): InsightSections {
  const kinds = kindMap(categories);
  const name = (id: string | null) =>
    (id && categories.find((c) => c.id === id)?.name) || t.dashboard.uncategorized;

  const changes = topCategoryIncreases(rows, kinds, month).map<Sentence>((c) => ({
    tone: "warning",
    href: `/transactions${filtersToQuery({ category: c.category_id ?? NO_CATEGORY, from: monthStart(month), to: monthEnd(month) })}`,
    text:
      c.pct === null
        ? fmt(t.insights.increaseNew, { category: name(c.category_id), amount: formatEUR(c.current) })
        : fmt(t.insights.increase, { category: name(c.category_id), diff: formatEUR(c.diff), pct: c.pct }),
  }));

  const uncategorized = uncategorizedSpending(rows, kinds, month);
  if (uncategorized > 0) {
    changes.push({
      tone: "neutral",
      href: `/transactions${filtersToQuery({ category: NO_CATEGORY, from: monthStart(month), to: monthEnd(month) })}`,
      text: fmt(t.insights.uncategorized, { amount: formatEUR(uncategorized) }),
    });
  }

  const recurring = detectRecurring(rows, kinds, asOf);
  const subscriptions = recurring.map<Sentence>((r) => ({
    tone: "neutral",
    href: `/transactions${filtersToQuery({ q: r.name })}`,
    text: fmt(t.insights.subscription, { name: r.name, monthly: formatEUR(r.monthly), yearly: formatEUR(r.yearly) }),
  }));
  if (recurring.length > 1) {
    const monthly = recurring.reduce((s, r) => s + r.monthly, 0);
    subscriptions.unshift({
      tone: "neutral",
      text: fmt(t.insights.subscriptionsTotal, { monthly: formatEUR(monthly), yearly: formatEUR(monthly * 12) }),
    });
  }

  const budgetSentences = budgetWarnings(budgets).map<Sentence>((b) =>
    b.status === "over"
      ? {
          tone: "critical",
          text: fmt(t.insights.budgetOver, {
            category: name(b.category_id),
            amount: formatEUR(b.spent - b.limit),
            limit: formatEUR(b.limit),
          }),
        }
      : {
          tone: "warning",
          text: fmt(t.insights.budgetNear, {
            category: name(b.category_id),
            pct: Math.round(b.ratio * 100),
            amount: formatEUR(b.limit - b.spent),
          }),
        },
  );

  const merchants = topMerchants(rows.filter((r) => r.date.startsWith(month)), kinds).map<Sentence>((m) => ({
    tone: "neutral",
    href: `/transactions${filtersToQuery({ q: m.name, from: monthStart(month), to: monthEnd(month) })}`,
    text: fmt(t.insights.topMerchant, { name: m.name, amount: formatEUR(m.cents), count: m.count }),
  }));

  return {
    changes,
    subscriptions,
    budgets: budgetSentences,
    merchants,
    empty: {
      changes: t.insights.noChanges,
      subscriptions: t.insights.noSubscriptions,
      budgets: budgets.length ? t.insights.noBudgetIssues : t.insights.noBudgets,
      merchants: t.insights.noMerchants,
    },
  };
}
