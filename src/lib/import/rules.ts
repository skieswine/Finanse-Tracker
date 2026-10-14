// Category rules: a case-insensitive substring match.
//   field "merchant"    → searches the merchant only
//   field "description" → searches description and merchant (anywhere in the text)
// Highest priority wins; ties go to the longer (more specific) pattern.
// Default rules (seeded) have priority -10, so user rules (0) always win.

export type CategoryRule = {
  id: string;
  pattern: string;
  field: "description" | "merchant";
  category_id: string;
  priority: number;
};

type RuleTarget = { description: string; merchant: string | null };

export function sortRules<T extends CategoryRule>(rules: readonly T[]): T[] {
  return [...rules].sort(
    (a, b) => b.priority - a.priority || b.pattern.length - a.pattern.length,
  );
}

export function ruleMatches(rule: CategoryRule, row: RuleTarget): boolean {
  const haystack =
    rule.field === "merchant" ? (row.merchant ?? "") : `${row.description} ${row.merchant ?? ""}`;
  return haystack.toLowerCase().includes(rule.pattern.toLowerCase());
}

/** Rules must be pre-sorted with sortRules(). */
export function matchRule<T extends CategoryRule>(row: RuleTarget, sortedRules: readonly T[]): T | null {
  return sortedRules.find((rule) => ruleMatches(rule, row)) ?? null;
}
