import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Service-role client: bypasses RLS. Server-only — used to create accounts
// after an invite code is redeemed, manage invite codes and delete accounts.
// The key comes from SUPABASE_SERVICE_ROLE_KEY (or the newer SUPABASE_SECRET_KEY)
// and must never be exposed to the browser (no NEXT_PUBLIC_ prefix!).

export function getServiceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || null;
}

/** null when the service key isn't configured (invites/account deletion unavailable). */
export function createAdminClient() {
  const key = getServiceKey();
  if (!key) return null;
  return createSupabaseClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** ADMIN_EMAILS="a@x.com,b@y.com" — who may create invite codes. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
