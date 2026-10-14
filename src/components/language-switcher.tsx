"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/types";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t.language.label}</span>
      <Languages className="pointer-events-none absolute left-2 size-4 text-muted-foreground" />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => setLocale(next));
        }}
        className="h-8 appearance-none rounded-lg border border-input bg-transparent pr-2 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-[Canvas] text-[CanvasText]">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
