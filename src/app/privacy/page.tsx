import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getLocale } from "@/lib/i18n/server";
import { PRIVACY } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const p = PRIVACY[await getLocale()];
  return { title: `${p.title} · Finly` };
}

/** Public page — Google requires a privacy policy URL to publish the OAuth app. */
export default async function PrivacyPage() {
  const p = PRIVACY[await getLocale()];
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <div className="mb-8 flex items-center justify-between gap-2">
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          ← {p.back}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{p.updated}</p>
      <p className="mt-6 leading-relaxed">{p.intro}</p>
      {p.sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="text-lg font-medium">{s.heading}</h2>
          {s.body.map((line) => (
            <p key={line} className="mt-2 leading-relaxed text-muted-foreground">
              {line}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
