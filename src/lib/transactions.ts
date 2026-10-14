import type { Enums } from "./supabase/database.types";
import type { TxType } from "./validation";

// Sign convention (amount is signed, from the account's point of view):
//   income            → +    (category kind "income")
//   expense           → −    (category kind "expense" or none)
//   savings deposit   → −    (category kind "savings"; money moves into savings)
//   savings withdrawal→ +    (category kind "savings")
//   transfer          → ±    (is_transfer = true; excluded from income/expense)

type CategoryKind = Enums<"category_kind">;

export function deriveTxType(
  tx: { amount_cents: number; is_transfer: boolean },
  categoryKind: CategoryKind | null | undefined,
): TxType {
  if (tx.is_transfer) return "transfer";
  if (categoryKind === "savings") return "savings";
  if (categoryKind === "income") return "income";
  if (categoryKind === "expense") return "expense";
  return tx.amount_cents > 0 ? "income" : "expense";
}

/** Category kind a transaction type may use (null = no category). */
export function categoryKindFor(type: TxType): CategoryKind | null {
  return type === "transfer" ? null : type;
}

export function signedCents(type: TxType, absCents: number, direction: "out" | "in"): number {
  switch (type) {
    case "income":
      return absCents;
    case "expense":
    case "savings":
      return -absCents;
    case "transfer":
      return direction === "in" ? absCents : -absCents;
  }
}
