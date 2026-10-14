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
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.auth.title} · ${t.app.name}` };
}

export default async function LoginPage() {
  const t = await getDictionary();

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
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
