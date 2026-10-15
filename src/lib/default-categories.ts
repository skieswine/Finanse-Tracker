import type { Locale } from "@/lib/i18n/types";

/**
 * Default categories are seeded in German (see the seed migrations). They are
 * translated on read, so the stored names, rules and links stay untouched;
 * a category the user renamed is no longer a default and is shown as is.
 */
const DEFAULT_NAMES: Record<string, Record<Exclude<Locale, "de">, string>> = {
  Lebensmittel: { uk: "Продукти", en: "Groceries", ru: "Продукты" },
  Miete: { uk: "Оренда", en: "Rent", ru: "Аренда" },
  Nebenkosten: { uk: "Комунальні", en: "Utilities", ru: "Коммунальные" },
  Transport: { uk: "Транспорт", en: "Transport", ru: "Транспорт" },
  Abos: { uk: "Підписки", en: "Subscriptions", ru: "Подписки" },
  Restaurants: { uk: "Ресторани", en: "Restaurants", ru: "Рестораны" },
  Shopping: { uk: "Покупки", en: "Shopping", ru: "Покупки" },
  Gesundheit: { uk: "Здоров'я", en: "Health", ru: "Здоровье" },
  Versicherungen: { uk: "Страхування", en: "Insurance", ru: "Страхование" },
  "Telefon & Internet": { uk: "Телефон та інтернет", en: "Phone & internet", ru: "Телефон и интернет" },
  Freizeit: { uk: "Дозвілля", en: "Leisure", ru: "Досуг" },
  Bildung: { uk: "Освіта", en: "Education", ru: "Образование" },
  Bargeld: { uk: "Готівка", en: "Cash", ru: "Наличные" },
  Sonstiges: { uk: "Інше", en: "Other", ru: "Прочее" },
  "Kredite & Schulden": { uk: "Кредити та борги", en: "Loans & debts", ru: "Кредиты и долги" },
  Gehalt: { uk: "Зарплата", en: "Salary", ru: "Зарплата" },
  Nebenjob: { uk: "Підробіток", en: "Side job", ru: "Подработка" },
  Erstattungen: { uk: "Повернення коштів", en: "Refunds", ru: "Возвраты" },
  "Sonstige Einnahmen": { uk: "Інші доходи", en: "Other income", ru: "Прочие доходы" },
  Sparen: { uk: "Заощадження", en: "Savings", ru: "Сбережения" },
  Notgroschen: { uk: "Резервний фонд", en: "Emergency fund", ru: "Резервный фонд" },
};

/** Seeded (German) names the app looks up by name. */
export const DEFAULT_CATEGORY = { debts: "Kredite & Schulden", subscriptions: "Abos" } as const;

export function localizeCategoryName(name: string, locale: Locale): string {
  if (locale === "de") return name;
  return DEFAULT_NAMES[name]?.[locale] ?? name;
}
