// Currencies (client + server). All totals are in EUR; a foreign-currency
// transaction keeps its original amount and the rate fixed at its date.

export const BASE_CURRENCY = "EUR";
export const CURRENCIES = ["EUR", "UAH", "USD", "PLN"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Original amount in cents → EUR cents, with `rate` = units of the currency
 * per 1 EUR (e.g. 49.5794 UAH). Rounded to whole cents.
 */
export function toEurCents(originalCents: number, rate: number): number {
  return Math.round(originalCents / rate);
}

const formatters = new Map<string, Intl.NumberFormat>();

/** 123456, "UAH" → "1.234,56 ₴" (de-DE number style, narrow symbol). */
export function formatMoney(
  cents: number,
  currency: string,
  { signed = false, whole = false } = {},
): string {
  const key = `${currency}|${signed}|${whole}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      signDisplay: signed ? "exceptZero" : "auto",
      ...(whole ? { maximumFractionDigits: 0 } : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

/** Rate for display: "1 € = 49,5794 ₴". */
export function formatRate(rate: number, currency: string): string {
  const symbol = formatMoney(0, currency).replace(/[\d\s.,]/g, "").trim() || currency;
  return `1 € = ${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 }).format(rate)} ${symbol}`;
}
