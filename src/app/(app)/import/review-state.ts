import { centsToInput, parseAmountToCents } from "@/lib/money";
import { guessMerchant } from "@/lib/import/german";
import { matchRule, type CategoryRule } from "@/lib/import/rules";
import { LOW_CONFIDENCE, type ParseWarning, type ParsedRow } from "@/lib/import/types";
import type { DuplicateInfo } from "@/lib/actions/import";

/** Special <select> value: mark the row as a transfer between own accounts. */
export const TRANSFER = "__transfer";

export type ReviewRow = {
  key: string;
  include: boolean;
  date: string;
  amountInput: string;
  description: string;
  merchant: string | null;
  /** "" | category uuid | TRANSFER */
  category: string;
  categorySource: "rule" | "manual" | null;
  confidence: number;
  warnings: ParseWarning[];
  duplicate: "exact" | "possible" | null;
  /** Computed from the parsed values, so edits don't change the row's identity. */
  dedupe_hash: string;
  /** Offer "create rule for …" after a manual category change. */
  rulePrompt: boolean;
};

export function isFlagged(row: ReviewRow) {
  return row.confidence < LOW_CONFIDENCE || row.duplicate !== null || rowAmount(row) === null;
}

export function rowAmount(row: ReviewRow): number | null {
  const cents = parseAmountToCents(row.amountInput);
  return cents ? cents : null;
}

export function buildReviewRows(
  parsed: ParsedRow[],
  hashes: string[],
  duplicates: DuplicateInfo,
  sortedRules: CategoryRule[],
  currency: string,
): ReviewRow[] {
  const existing = new Set(duplicates.existingHashes);
  const sameDayAmount = new Set(duplicates.sameDayAmountKeys);
  return parsed.map((p, i) => {
    const rule = matchRule(p, sortedRules);
    const duplicate = existing.has(hashes[i])
      ? "exact"
      : sameDayAmount.has(`${p.date}|${currency}|${p.amount_cents}`)
        ? "possible"
        : null;
    return {
      key: `${i}-${hashes[i].slice(0, 8)}`,
      // Exact duplicates start unchecked; possible ones only get a warning.
      include: duplicate !== "exact",
      date: p.date,
      amountInput: centsToInput(p.amount_cents),
      description: p.description,
      merchant: p.merchant,
      // A transfer between own accounts recognised by the parser wins over rules.
      category: p.transfer ? TRANSFER : (rule?.category_id ?? ""),
      categorySource: !p.transfer && rule ? "rule" : null,
      confidence: p.confidence,
      warnings: p.warnings,
      duplicate,
      dedupe_hash: hashes[i],
      rulePrompt: false,
    };
  });
}

/** What a new rule should match for this row. */
export function rulePatternFor(row: Pick<ReviewRow, "merchant" | "description">) {
  if (row.merchant) return { pattern: row.merchant, field: "merchant" as const };
  const guess = guessMerchant(row.description) ?? row.description.slice(0, 40).trim();
  return { pattern: guess, field: "description" as const };
}

export type ReviewAction =
  | { type: "reset"; rows: ReviewRow[] }
  | { type: "update"; key: string; patch: Partial<ReviewRow> }
  | { type: "setCategory"; key: string; category: string }
  | { type: "includeAll"; include: boolean; keys: string[] }
  | { type: "applyRule"; rule: CategoryRule };

export function reviewReducer(rows: ReviewRow[], action: ReviewAction): ReviewRow[] {
  switch (action.type) {
    case "reset":
      return action.rows;
    case "update":
      return rows.map((r) => (r.key === action.key ? { ...r, ...action.patch } : r));
    case "setCategory":
      return rows.map((r) =>
        r.key === action.key
          ? {
              ...r,
              category: action.category,
              categorySource: "manual",
              // Only suggest a rule for a real category and something to match on.
              rulePrompt:
                action.category !== "" &&
                action.category !== TRANSFER &&
                rulePatternFor(r).pattern.length >= 2,
            }
          : r,
      );
    case "includeAll": {
      const keys = new Set(action.keys);
      return rows.map((r) => (keys.has(r.key) ? { ...r, include: action.include } : r));
    }
    case "applyRule":
      // Never overwrite a category the user picked by hand.
      return rows.map((r) =>
        r.categorySource !== "manual" && matchRule(r, [action.rule])
          ? { ...r, category: action.rule.category_id, categorySource: "rule" }
          : r,
      );
  }
}
