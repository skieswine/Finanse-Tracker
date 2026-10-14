import { describe, expect, it } from "vitest";
import { matchRule, sortRules, type CategoryRule } from "./rules";

const rule = (p: Partial<CategoryRule>): CategoryRule => ({
  id: p.pattern ?? "r",
  pattern: "x",
  field: "description",
  category_id: "c",
  priority: 0,
  ...p,
});

describe("category rules", () => {
  const rules = sortRules([
    rule({ pattern: "rewe", category_id: "groceries" }),
    rule({ pattern: "rewe to go", category_id: "restaurants" }),
    rule({ pattern: "amazon", field: "merchant", category_id: "shopping" }),
    rule({ pattern: "miete", category_id: "rent", priority: 10 }),
  ]);

  it("matches case-insensitive substrings on the chosen field", () => {
    expect(matchRule({ description: "Lastschrift REWE Markt", merchant: null }, rules)?.category_id).toBe("groceries");
    expect(matchRule({ description: "Amazon order", merchant: null }, rules)).toBeNull();
    expect(matchRule({ description: "x", merchant: "AMAZON EU" }, rules)?.category_id).toBe("shopping");
  });

  it("prefers the more specific pattern, then priority", () => {
    expect(matchRule({ description: "REWE To Go Bahnhof", merchant: null }, rules)?.category_id).toBe("restaurants");
    expect(matchRule({ description: "Miete REWE Parkplatz", merchant: null }, rules)?.category_id).toBe("rent");
  });
});

describe("description rules also look at the merchant", () => {
  it("finds the pattern in the merchant when the description lacks it", () => {
    const rules = sortRules([rule({ pattern: "spotify", category_id: "abos" })]);
    expect(matchRule({ description: "Lastschrift 12345", merchant: "Spotify AB" }, rules)?.category_id).toBe("abos");
  });

  it("user rules (priority 0) beat default rules (priority -10)", () => {
    const rules = sortRules([
      rule({ pattern: "amazon prime", category_id: "abos-default", priority: -10 }),
      rule({ pattern: "amazon", category_id: "mine", priority: 0 }),
    ]);
    expect(matchRule({ description: "Amazon Prime Membership", merchant: null }, rules)?.category_id).toBe("mine");
  });
});
