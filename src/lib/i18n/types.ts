import type { uk } from "./dictionaries/uk";

export const LOCALES = ["uk", "en", "de", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uk";
export const LOCALE_COOKIE = "locale";

/** Native names, shown in the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
};

/** BCP 47 tags for Intl date formatting. Money always uses de-DE (EUR). */
export const INTL_LOCALE: Record<Locale, string> = {
  uk: "uk-UA",
  en: "en-GB",
  de: "de-DE",
  ru: "ru-RU",
};

export type Dictionary = typeof uk;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** fmt("{saved} of {target}", { saved: "1 €", target: "2 €" }) */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
