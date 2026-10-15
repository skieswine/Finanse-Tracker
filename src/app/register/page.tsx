import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { getDictionary } from "@/lib/i18n/server";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.register.title} · ${t.app.name}` };
}

/** /register?code=ABCD-2345 — the link from an invitation pre-fills the code. */
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const [t, params] = await Promise.all([getDictionary(), searchParams]);
  const code = typeof params.code === "string" ? params.code.slice(0, 32) : "";

  return (
    <AuthCard title={t.register.title} description={t.register.subtitle}>
      <RegisterForm code={code} />
      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {t.register.haveAccount}
      </Link>
    </AuthCard>
  );
}
