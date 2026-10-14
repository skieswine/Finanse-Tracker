import { describe, expect, it } from "vitest";
import { byCategory, expensesByCategory, kindMap, monthlyTotals, totals, type SummaryTx } from "./summary";

const kinds = kindMap([
  { id: "salary", kind: "income" },
  { id: "food", kind: "expense" },
  { id: "rent", kind: "expense" },
  { id: "save", kind: "savings" },
]);

const tx = (date: string, amount_cents: number, category_id: string | null, is_transfer = false): SummaryTx => ({
  date,
  amount_cents,
  category_id,
  is_transfer,
});

const october: SummaryTx[] = [
  tx("2026-10-01", 285000, "salary"),
  tx("2026-10-02", -95000, "rent"),
  tx("2026-10-03", -2345, "food"),
  tx("2026-10-04", -4140, "food"),
  tx("2026-10-05", 500, "food"), // refund
  tx("2026-10-10", -20000, "save"), // savings deposit
  tx("2026-10-11", -50000, null, true), // transfer: ignored
  tx("2026-10-12", -1299, null), // uncategorised outflow
  tx("2026-10-13", 1500, null), // uncategorised inflow
];

describe("totals", () => {
  it("splits income, expenses and savings and excludes transfers", () => {
    expect(totals(october, kinds)).toEqual({
      income: 286500,
      expenses: 95000 + 2345 + 4140 - 500 + 1299,
      savings: 20000,
      net: 286500 - 102284 - 20000,
    });
  });

  it("is all zeros for no transactions", () => {
    expect(totals([], kinds)).toEqual({ income: 0, expenses: 0, savings: 0, net: 0 });
  });
});

describe("expensesByCategory", () => {
  it("sums spending per category net of refunds, largest first", () => {
    expect(expensesByCategory(october, kinds)).toEqual([
      { category_id: "rent", cents: 95000, count: 1 },
      { category_id: "food", cents: 5985, count: 3 },
      { category_id: null, cents: 1299, count: 1 },
    ]);
  });
});

describe("byCategory", () => {
  it("returns positive values per class", () => {
    const rows = byCategory(october, kinds);
    expect(rows.find((r) => r.category_id === "salary")).toMatchObject({ class: "income", cents: 285000 });
    expect(rows.find((r) => r.category_id === "save")).toMatchObject({ class: "savings", cents: 20000 });
    expect(rows.some((r) => r.class === "transfer")).toBe(false);
  });
});

describe("monthlyTotals", () => {
  it("returns every month in the window, oldest first, including empty ones", () => {
    const rows = monthlyTotals([...october, tx("2026-08-15", -1000, "food")], kinds, "2026-10", 6);
    expect(rows.map((r) => r.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(rows[3].expenses).toBe(1000);
    expect(rows[4]).toMatchObject({ income: 0, expenses: 0 });
    expect(rows[5].income).toBe(286500);
  });

  it("crosses year boundaries", () => {
    expect(monthlyTotals([], kinds, "2026-02", 3).map((r) => r.month)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
