import { describe, expect, it } from "vitest";
import {
  budgetWarnings,
  detectRecurring,
  payeeKey,
  topCategoryIncreases,
  topMerchants,
  type InsightTx,
} from "./insights";
import { kindMap } from "./summary";

const kinds = kindMap([
  { id: "food", kind: "expense" },
  { id: "fun", kind: "expense" },
  { id: "abos", kind: "expense" },
  { id: "salary", kind: "income" },
]);

const tx = (
  date: string,
  amount_cents: number,
  merchant: string | null,
  category_id: string | null = "food",
  description = "",
): InsightTx => ({ date, amount_cents, merchant, category_id, is_transfer: false, description });

describe("topCategoryIncreases", () => {
  const txs = [
    tx("2026-09-05", -10000, "REWE", "food"),
    tx("2026-10-05", -16000, "REWE", "food"), // +60 €, +60 %
    tx("2026-10-06", -4500, "Kino", "fun"), // new: +45 €
    tx("2026-09-10", -1299, "Netflix", "abos"),
    tx("2026-10-10", -1299, "Netflix", "abos"), // unchanged
    tx("2026-10-01", 300000, "Arbeitgeber", "salary"), // income ignored
  ];

  it("ranks the biggest increases and handles new categories", () => {
    expect(topCategoryIncreases(txs, kinds, "2026-10")).toEqual([
      { category_id: "food", current: 16000, previous: 10000, diff: 6000, pct: 60 },
      { category_id: "fun", current: 4500, previous: 0, diff: 4500, pct: null },
    ]);
  });

  it("ignores small changes (< 10 €)", () => {
    const small = [tx("2026-09-01", -1000, "A", "food"), tx("2026-10-01", -1500, "A", "food")];
    expect(topCategoryIncreases(small, kinds, "2026-10")).toEqual([]);
  });

  it("works across the year boundary", () => {
    const jan = [tx("2025-12-10", -2000, "A", "food"), tx("2026-01-10", -5000, "A", "food")];
    expect(topCategoryIncreases(jan, kinds, "2026-01")[0]).toMatchObject({ previous: 2000, diff: 3000 });
  });
});

describe("payeeKey / topMerchants", () => {
  it("groups variants of the same payee", () => {
    expect(payeeKey({ merchant: "REWE Markt GmbH", description: "" })).toBe("rewe markt");
    expect(payeeKey({ merchant: null, description: "Lastschrift REWE Markt GmbH//Berlin" })).toBe("rewe markt");
  });

  it("ranks payees by spending with purchase counts", () => {
    const txs = [
      tx("2026-10-01", -2000, "REWE Markt GmbH"),
      tx("2026-10-08", -3000, "REWE Markt GmbH"),
      tx("2026-10-03", -4000, "IKEA"),
      tx("2026-10-04", -500, "Bäckerei"),
    ];
    expect(topMerchants(txs, kinds, 2)).toEqual([
      { key: "rewe markt", name: "REWE Markt GmbH", cents: 5000, count: 2 },
      { key: "ikea", name: "IKEA", cents: 4000, count: 1 },
    ]);
  });
});

describe("detectRecurring", () => {
  const netflix = ["2026-06-15", "2026-07-15", "2026-08-16", "2026-09-15", "2026-10-15"].map((d) =>
    tx(d, -1299, "Netflix International B.V.", "abos"),
  );

  it("finds a monthly subscription and its yearly cost", () => {
    const [sub] = detectRecurring(netflix, kinds, "2026-10-31");
    expect(sub).toMatchObject({ name: "Netflix International B.V.", monthly: 1299, yearly: 15588, occurrences: 5 });
  });

  it("tolerates a small price change", () => {
    const changed = [...netflix.slice(0, 4), tx("2026-10-15", -1399, "Netflix International B.V.", "abos")];
    expect(detectRecurring(changed, kinds, "2026-10-31")[0]?.monthly).toBe(1399);
  });

  it("ignores frequent shopping with varying amounts", () => {
    const groceries = ["2026-10-01", "2026-10-04", "2026-10-09", "2026-10-15", "2026-10-22"].map((d, i) =>
      tx(d, -(2000 + i * 777), "REWE"),
    );
    expect(detectRecurring(groceries, kinds, "2026-10-31")).toEqual([]);
  });

  it("ignores subscriptions that stopped", () => {
    expect(detectRecurring(netflix.slice(0, 3), kinds, "2026-10-31")).toEqual([]);
  });

  it("needs at least three payments", () => {
    expect(detectRecurring(netflix.slice(-2), kinds, "2026-10-31")).toEqual([]);
  });
});

describe("budgetWarnings", () => {
  it("reports exceeded and nearly-used budgets, worst first", () => {
    expect(
      budgetWarnings([
        { category_id: "food", limit_cents: 20000, spent_cents: 23550 },
        { category_id: "fun", limit_cents: 10000, spent_cents: 9200 },
        { category_id: "abos", limit_cents: 5000, spent_cents: 1000 },
      ]).map((b) => [b.category_id, b.status]),
    ).toEqual([
      ["food", "over"],
      ["fun", "near"],
    ]);
  });
});
