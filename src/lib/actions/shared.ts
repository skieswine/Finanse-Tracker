import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
