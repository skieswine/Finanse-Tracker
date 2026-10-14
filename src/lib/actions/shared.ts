import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BASE_CURRENCY, toEurCents, type Currency } from "@/lib/currency";
import { getRate } from "@/lib/fx";
import { fromCents } from "@/lib/money";
import type { FieldErrors, ValidationKey } from "@/lib/validation";

export type ActionState = {
  ok?: boolean;
  /** Form-level error (dictionary key). */
  error?: ValidationKey;
  fieldErrors?: FieldErrors;
};

/**
 * Every action re-checks the session instead of trusting the client.
 * Returns a client bound to the user's session (RLS applies).
 */
export async function authedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Postgres unique_violation. */
export function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

/**
 * DB money columns for an amount entered in `currency`:
 * EUR → { amount, currency: "EUR", original_amount: null, fx_rate: null };
 * other → EUR amount at `manualRate` or the rate on `date`, plus the original.
 * Returns null when no rate is available.
 */
export async function toBaseAmount(
  originalCents: number,
  currency: Currency,
  date: string,
  manualRate: number | null,
) {
  if (currency === BASE_CURRENCY) {
    return { amount: fromCents(originalCents), currency, original_amount: null, fx_rate: null };
  }
  const rate = manualRate ?? (await getRate(currency, date));
  if (!rate) return null;
  // Never round a non-zero foreign amount down to 0 € (DB requires amount <> 0).
  const eur = toEurCents(originalCents, rate) || Math.sign(originalCents);
  return { amount: fromCents(eur), currency, original_amount: fromCents(originalCents), fx_rate: rate };
}
