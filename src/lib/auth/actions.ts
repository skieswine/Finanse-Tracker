"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export type SignInState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
};

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const t = await getDictionary();
  const signInSchema = z.object({
    email: z.email({ error: t.auth.errors.invalidEmail }),
    password: z.string().min(1, { error: t.auth.errors.passwordRequired }),
  });

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      },
      email: String(formData.get("email") ?? ""),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? t.auth.errors.invalidCredentials
          : t.auth.errors.generic,
      email: parsed.data.email,
    };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
