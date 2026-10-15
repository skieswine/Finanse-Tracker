import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { getDictionary } from "@/lib/i18n/server";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.forgot.title} · ${t.app.name}` };
}

export default async function ForgotPage() {
  const t = await getDictionary();
  return (
    <AuthCard title={t.forgot.title} description={t.forgot.subtitle}>
      <ForgotForm />
      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {t.forgot.back}
      </Link>
    </AuthCard>
  );
}
