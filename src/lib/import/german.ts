// Heuristics for German bank statements: dates, amounts, signs, merchants.

import { isISODate } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/money";

export type ParsedDate = { iso: string; yearGuessed: boolean };

/**
 * "14.10.2026" | "14.10.26" | "4.1.2026" | "2026-10-14" → ISO date.
 * "14.10." (no year) uses `fallbackYear` and flags yearGuessed.
 */
export function parseGermanDate(input: string, fallbackYear?: number): ParsedDate | null {
  const s = input.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const value = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return isISODate(value) ? { iso: value, yearGuessed: false } : null;
  }

  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?$/.exec(s);
  if (!de) return null;

  let year: number;
  let yearGuessed = false;
  if (de[3]) {
    year = Number(de[3].length === 2 ? `20${de[3]}` : de[3]);
  } else if (fallbackYear) {
    year = fallbackYear;
    yearGuessed = true;
  } else {
    return null;
  }

  const value = `${year}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  return isISODate(value) ? { iso: value, yearGuessed } : null;
}

export type AmountMatch = {
  /** Absolute value in cents. */
  cents: number;
  /** +1 / −1 when the text says so (sign, trailing "-", S/H), else null. */
  sign: 1 | -1 | null;
  index: number;
  length: number;
};

// German-formatted money with a mandatory ",dd" part, optional sign before,
// optional "€"/"EUR" and an optional trailing sign or Soll/Haben marker.
const AMOUNT_RE =
  /(?<![\d.,])([+\-−–]\s?)?((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?![\d,])(\s?(?:€|EUR))?(\s?(?:[+\-−–](?![\d])|[SH]\b))?/g;

/** All amounts in a text line, left to right. */
export function findAmounts(line: string): AmountMatch[] {
  const out: AmountMatch[] = [];
  for (const m of line.matchAll(AMOUNT_RE)) {
    const cents = parseAmountToCents(m[2]);
    if (cents === null) continue;
    const lead = m[1]?.trim();
    const trail = m[4]?.trim();
    let sign: 1 | -1 | null = null;
    if (lead) sign = lead === "+" ? 1 : -1;
    else if (trail === "S") sign = -1;
    else if (trail === "H") sign = 1;
    else if (trail) sign = trail === "+" ? 1 : -1;
    out.push({ cents, sign, index: m.index, length: m[0].length });
  }
  return out;
}

const INCOME_RE =
  /gutschrift|gehalt|lohn|bezüge|bezuege|zahlungseingang|eingang|erstattung|rückzahlung|rueckzahlung|zinsen|dividende|einzahlung|kindergeld|rente/i;

/** Last resort when the statement doesn't say whether money came in or out. */
export function guessSign(text: string): 1 | -1 {
  return INCOME_RE.test(text) ? 1 : -1;
}

// Booking-type words and reference noise that are not the merchant.
// (?<!\p{L}) / (?!\p{L}) instead of \b: \b doesn't treat umlauts as letters.
// Includes Sparkasse abbreviations ("KartenzahlgDebitkarte", "Überw.").
const BOOKING_WORDS_RE =
  /(?<!\p{L})(?:kartenzahlg\.?\s*debitkarte|kartenzahlung\s*debitkarte)(?!\p{L})|(?<!\p{L})(?:sepa[- ]?)?(?:basis[- ]?|folge|erst|echtzeit-?|online-?)?(?:lastschrift|überweisung|ueberweisung|überw\.|gutschrift|dauerauftrag|kartenzahlung|kartenzahlg\.?|kartenumsatz|einzug|abbuchung|bargeldauszahlung|zahlung)(?!\p{L})|(?<!\p{L})(?:visa|mastercard|girocard|debitkarte|debitk\.?|ec|pos|npp|apple ?pay|google ?pay)(?!\p{L})/giu;
const NOISE_RE =
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b|\b\d{2}\.\d{2}(\.\d{2,4})?\b|\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d{5,}\b/g;
const CUT_RE =
  /\/\/|\s\/\s|(?<!\p{L})(?:end-to-end|eref|mref|cred|mandat|gläubiger|glaeubiger|referenz|kundenreferenz|svwz|abwa)(?!\p{L})/iu;

// Statement noise that only makes descriptions long: value dates, card
// timestamps and "KEY: value" references (Sparkasse, SEPA).
const DESCRIPTION_NOISE_RE = [
  /\/?\s*wert:\s*\d{1,2}\.\d{1,2}\.\d{2,4}/giu,
  /\b\d{4}-\d{2}-\d{2}T[\d:.]+/g,
  /(?<!\p{L})(?:eref|mref|cred|kref|iban|bic|abwa|abwe)[:+]\s*\S+/giu,
  /(?<!\p{L})(?:folgenr|verfalld)\.?\s*[\d-]+/giu,
];

/** Shorter, readable description: drops value dates, timestamps, references. */
export function cleanDescription(text: string): string {
  let out = text;
  for (const re of DESCRIPTION_NOISE_RE) out = out.replace(re, " ");
  return out.replace(/\s+/g, " ").replace(/[\s/]+$/, "").trim();
}

/** Best-effort merchant name from a free-text description. */
export function guessMerchant(description: string): string | null {
  const cleaned = cleanDescription(description)
    .replace(BOOKING_WORDS_RE, " ")
    .replace(NOISE_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  const head = cleaned.split(CUT_RE)[0] ?? "";
  const words = head
    .replace(/[^\p{L}\p{N}&.'\- ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^[\d.\-]+$/.test(w))
    .slice(0, 3);
  const name = words.join(" ").replace(/^[-.\s]+/, "").trim();
  return name.length >= 2 ? name : null;
}

/** Most frequent 4-digit year in the statement — used for "14.10." dates. */
export function inferStatementYear(text: string, fallback = new Date().getFullYear()): number {
  const counts = new Map<number, number>();
  for (const m of text.matchAll(/\b(20\d{2})\b/g)) {
    const y = Number(m[1]);
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  let best = fallback;
  let bestCount = 0;
  for (const [y, c] of counts) {
    if (c > bestCount) {
      best = y;
      bestCount = c;
    }
  }
  return best;
}

/** Normalise a header cell: "Begünstigter/Zahlungspflichtiger" → "beguenstigterzahlungspflichtiger". */
export function normalizeHeader(cell: string): string {
  return cell
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");
}

/** Lines like "Alter Kontostand", "Saldo", "Übertrag" are not transactions. */
export const SUMMARY_LINE_RE =
  /(?<!\p{L})(?:saldo|kontostand|übertrag|uebertrag|zwischensumme|summe|endsaldo|anfangssaldo|neuer stand|alter stand)(?!\p{L})/iu;
