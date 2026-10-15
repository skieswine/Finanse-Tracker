import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY } from "@/app/privacy/content";
import { AuthCard } from "@/components/auth-card";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.auth.title} · ${t.app.name}` };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [t, params] = await Promise.all([getDictionary(), searchParams]);
  const error =
    params.error === "oauth" ? t.auth.errors.oauth : params.error === "reset" ? t.auth.resetFailed : null;

  return (
    <AuthCard title={t.auth.title} description={t.auth.subtitle}>
      {params.deleted === "1" && (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
          {t.auth.deleted}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <LoginForm />
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t.auth.forgot}
        </Link>
        <Link href="/register" className="font-medium underline-offset-4 hover:underline">
          {t.auth.haveInvite}
        </Link>
      </div>
      <Link href="/privacy" className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {PRIVACY[await getLocale()].title}
      </Link>
    </AuthCard>
  );
}
