import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getDictionary } from "@/lib/i18n/server";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.auth.title} · ${t.app.name}` };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [t, params] = await Promise.all([getDictionary(), searchParams]);
  const oauthFailed = params.error === "oauth";

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <CardTitle className="text-xl">{t.auth.title}</CardTitle>
          <CardDescription>{t.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {oauthFailed && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t.auth.errors.oauth}
            </p>
          )}
          <GoogleButton />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t.auth.or}
            <span className="h-px flex-1 bg-border" />
          </div>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
