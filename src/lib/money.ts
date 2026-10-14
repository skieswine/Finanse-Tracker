// Money is handled as integer cents everywhere in JS. Floats only appear
// at the DB boundary (PostgREST returns numeric as a JSON number).

/** DB numeric (e.g. 12.34) → integer cents (1234). */
export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

/** Integer cents → value for a numeric(12,2) column. */
export function fromCents(cents: number): number {
  // cents/100 always round-trips to the 2-decimal string ("12.34").
  return cents / 100;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const eurSignedFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  signDisplay: "exceptZero",
});

/** 123456 → "1.234,56 €" (always de-DE, whatever the UI language). */
export function formatEUR(cents: number, { signed = false } = {}): string {
  return (signed ? eurSignedFormatter : eurFormatter).format(cents / 100);
}

/** Cents → "1234,56" for an editable input. */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${euros},${rest}`;
}

/**
 * Parse a user- or bank-provided amount into integer cents.
 * Accepts German and international formats:
 *   "1.234,56"  "1234,56"  "-12,5"  "12,50 €"  "1,234.56"  "12.34"  "1.234"
 * Rules: if both "," and "." appear, the last one is the decimal separator.
 * A lone "," is decimal. A lone "." is a thousands separator only when it
 * groups exactly three digits (German "1.234" = 1234), otherwise decimal.
 * Returns null when the input is not a number.
 */
export function parseAmountToCents(input: string): number | null {
  let s = input.trim().replace(/[\s €]|EUR/gi, "");
  if (!s) return null;

  let negative = false;
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  } else if (s.endsWith("-")) {
    // Some German statements print "12,50-"
    negative = true;
    s = s.slice(0, -1);
  }

  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let fracPart = "";

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIdx = Math.max(lastComma, lastDot);
    intPart = s.slice(0, decimalIdx).replace(/[.,]/g, "");
    fracPart = s.slice(decimalIdx + 1);
  } else if (lastComma >= 0) {
    if (s.indexOf(",") !== lastComma) return null; // "1,234,56"
    intPart = s.slice(0, lastComma);
    fracPart = s.slice(lastComma + 1);
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      intPart = s.replace(/\./g, "");
    } else {
      if (s.indexOf(".") !== lastDot) return null;
      intPart = s.slice(0, lastDot);
      fracPart = s.slice(lastDot + 1);
    }
  } else {
    intPart = s;
  }

  if (!/^\d*$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null;
  if (!intPart && !fracPart) return null;

  const cents = Number(intPart || "0") * 100 + Number(fracPart.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}
