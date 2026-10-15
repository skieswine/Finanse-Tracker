"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requestOrigin } from "@/lib/auth/origin";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors, type ValidationKey } from "@/lib/validation";
import { formValues, type ActionState } from "./shared";

const err = (key: ValidationKey) => ({ error: key });

const inviteCode = z
  .string(err("required"))
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{6,32}$/, err("inviteInvalid"));
const email = z.email(err("invalid")).trim().toLowerCase();
const password = z.string(err("required")).min(8, err("passwordShort")).max(72, err("tooLong"));

// ---------------------------------------------------------------- register

const registerSchema = z
  .object({ code: inviteCode, email, password, password2: z.string() })
  .refine((v) => v.password === v.password2, { path: ["password2"], ...err("passwordMismatch") });

/**
 * Public sign-ups are disabled in Supabase; an account is created here, by the
 * server (service role), only after a valid invite code was redeemed.
 */
export async function registerWithInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const { code, email: mail, password: pass } = parsed.data;

  const admin = createAdminClient();
  if (!admin) return { error: "notConfigured" };

  const { data: redeemed } = await admin.rpc("redeem_invite", { p_code: code });
  if (!redeemed) return { fieldErrors: { code: "inviteInvalid" } };

  const { error } = await admin.auth.admin.createUser({ email: mail, password: pass, email_confirm: true });
  if (error) {
    await admin.rpc("release_invite", { p_code: code });
    return error.code === "email_exists" || error.status === 422
      ? { fieldErrors: { email: "emailTaken" } }
      : { error: "saveFailed" };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: mail, password: pass });
  redirect("/");
}

/**
 * Invite sign-up with Google: we can't know the Google account before OAuth,
 * and public sign-ups stay disabled — so the person states their Gmail, we
 * redeem the code and pre-create a passwordless account for it, then start
 * Google sign-in. Supabase links the Google identity to that existing user.
 */
export async function registerWithGoogle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ code: inviteCode, email }).safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const { code, email: mail } = parsed.data;

  const admin = createAdminClient();
  if (!admin) return { error: "notConfigured" };

  const { data: redeemed } = await admin.rpc("redeem_invite", { p_code: code });
  if (!redeemed) return { fieldErrors: { code: "inviteInvalid" } };

  const { error } = await admin.auth.admin.createUser({ email: mail, email_confirm: true });
  if (error) {
    await admin.rpc("release_invite", { p_code: code });
    return error.code === "email_exists" || error.status === 422
      ? { fieldErrors: { email: "emailTaken" } }
      : { error: "saveFailed" };
  }

  const supabase = await createClient();
  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await requestOrigin()}/auth/callback`,
      // Pre-select the stated Gmail in Google's account chooser.
      queryParams: { login_hint: mail, prompt: "select_account" },
    },
  });
  if (oauthError || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

// ---------------------------------------------------------------- password

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email }).safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/account`,
  });
  // Never reveal whether the address has an account; only report rate limits.
  if (error?.status === 429) return { error: "tooMany" };
  return { ok: true };
}

const changePasswordSchema = z
  .object({ password, password2: z.string() })
  .refine((v) => v.password === v.password2, { path: ["password2"], ...err("passwordMismatch") });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "samePassword" : "saveFailed" };
  return { ok: true };
}

// ---------------------------------------------------------------- delete account

/** Deletes the signed-in user; every table cascades on auth.users deletion. */
export async function deleteAccount(confirmEmail: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  if (typeof claims.email !== "string" || confirmEmail.trim().toLowerCase() !== claims.email.toLowerCase()) {
    return { error: "emailMismatch" };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "notConfigured" };
  const { error } = await admin.auth.admin.deleteUser(claims.sub);
  if (error) return { error: "deleteFailed" };

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}

// ---------------------------------------------------------------- invites (admins)

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const admin = createAdminClient();
  if (!admin || !isAdminEmail(typeof claims.email === "string" ? claims.email : null)) return null;
  return { admin, userId: claims.sub };
}

// No 0/O/1/I/L — easy to read out loud and to type from a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

const inviteSchema = z.object({
  max_uses: z.coerce.number(err("invalid")).int(err("invalid")).min(1, err("invalid")).max(100, err("invalid")),
  expires_days: z.coerce.number(err("invalid")).int(err("invalid")).min(0, err("invalid")).max(365, err("invalid")),
  note: z.string().trim().max(100, err("tooLong")).default(""),
});

export async function createInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "notConfigured" };
  const parsed = inviteSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { max_uses, expires_days, note } = parsed.data;
  const { error } = await ctx.admin.from("invite_codes").insert({
    code: generateCode(),
    created_by: ctx.userId,
    note: note || null,
    max_uses,
    expires_at: expires_days ? new Date(Date.now() + expires_days * 86_400_000).toISOString() : null,
  });
  if (error) return { error: "saveFailed" };
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteInvite(code: string): Promise<ActionState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "notConfigured" };
  const { error } = await ctx.admin.from("invite_codes").delete().eq("code", code);
  if (error) return { error: "deleteFailed" };
  revalidatePath("/account");
  return { ok: true };
}
