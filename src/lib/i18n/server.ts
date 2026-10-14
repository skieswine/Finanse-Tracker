import "server-only";
import { cookies, headers } from "next/headers";
import { dictionaries } from "./dictionaries";
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Dictionary,
  type Locale,
} from "./types";

/** Saved choice (cookie) → browser language → Ukrainian. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const lang = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}


/** Dictionary + Intl locale for date formatting in one call. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale], intlLocale: INTL_LOCALE[locale] };
}
