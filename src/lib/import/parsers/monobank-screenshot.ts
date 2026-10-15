// Parser for screenshots of the monobank app's transaction list (OCR text).
//
// Real Tesseract output looks like this (icons become junk, "₴" becomes "2"/"8",
// and the amount often lands on the promo-subtitle line, not on the payee line):
//
//   11:33. п: т Є                                  ← status bar   } ignored: everything
//   169.12 2                                        ← card balance } above the first date header
//   13 жовтня                                       ← date header ("Сьогодні", "Вчора", "13 жовтня [2025]")
//   Steam =                                         ← payee (amount on the next line)
//   “a W Підкинемо картці настрою? -216.00 2        ← promo subtitle + amount
//   ГИ Bin: MONOBANK 130.00 2                       ← icon junk + payee + amount ("Від:" read as "Bin:")
//   Що) Dom | ‚160.00 2                             ← declined payment…
//   Ф недостатньо коштів Ha картці                  ← …dropped
//   ги З єврової картки 250.50 2                    ← between own cards → transfer
//
// mono prints "-" on debits only; promo subtitles ("…?") appear on purchases only,
// so an unsigned amount on a "?" line is a debit whose minus OCR lost.

import { isISODate, todayISO } from "@/lib/dates";
import type { ExtractedDocument, ParseWarning, ParsedRow, StatementParser } from "../types";

const MONTHS: Record<string, number> = {
  січня: 1, лютого: 2, березня: 3, квітня: 4, травня: 5, червня: 6,
  липня: 7, серпня: 8, вересня: 9, жовтня: 10, листопада: 11, грудня: 12,
};

const DATE_HEADER_RE = new RegExp(
  `^(?:(сьогодні)|(вчора)|(\\d{1,2})\\s+(${Object.keys(MONTHS).join("|")})(?:\\s+(\\d{4}))?)\\.?$`,
  "iu",
);

// Amount at the end of a line: "-216.00 ₴", "1 245.50 ₴", "130,00 грн".
// OCR often misreads "₴" (as "2", "8", …), so allow a short junk tail instead.
const AMOUNT_RE = /(^|\s)([-−–+‚,]?)\s?(\d{1,3}(?:[  ]\d{3})+|\d+)[.,](\d{2})(?:\s*(?:₴|грн|uah|€|\$|zł))?\s*\S{0,2}$/iu;

const DECLINED_RE = /недостатньо\s+коштів|відхилен|скасован|операцію\s+не\s+виконано/iu;
// (?<!\p{L}) / (?!\p{L}) instead of \b: \b does not understand Cyrillic letters.
const OWN_TRANSFER_RE = /(?<!\p{L})(?:з|на)\s+\S+\s+(?:картк[иу]|банк[иу]|рахун(?:ку|ок))(?!\p{L})/iu;
const LETTER_RE = /\p{L}{2,}/u;
const PROMO_RE = /\?/;

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Header → ISO date relative to `today`; years default to the latest non-future one. */
export function parseMonoDateHeader(line: string, today: string): { iso: string; relative: boolean } | null {
  const m = DATE_HEADER_RE.exec(line.trim());
  if (!m) return null;
  if (m[1]) return { iso: today, relative: true };
  if (m[2]) return { iso: shiftDays(today, -1), relative: true };
  const day = Number(m[3]);
  const month = MONTHS[m[4].toLowerCase()];
  const thisYear = Number(today.slice(0, 4));
  const make = (y: number) => `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  let iso = make(m[5] ? Number(m[5]) : thisYear);
  if (!m[5] && iso > today) iso = make(thisYear - 1);
  return isISODate(iso) ? { iso, relative: false } : null;
}

/**
 * Payee from an OCR line: keeps "З єврової картки"-style phrases whole, fixes
 * "Bin:" → "Від:", drops icon junk (short leading/trailing tokens, symbols).
 */
export function cleanPayee(text: string): string {
  const transfer = OWN_TRANSFER_RE.exec(text);
  if (transfer) return capitalize(text.slice(transfer.index).trim().replace(/\s+/g, " "));

  let tokens = text
    .replace(/(^|\s)bin:/iu, "$1Від:")
    .replace(/[^\p{L}\p{N}\s:.&'’\-/]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  // Icon junk: 1–2 character tokens at the edges ("ГИ", "EZ", "Sr", "a", "W").
  while (tokens.length > 1 && tokens[0].replace(/[:.]/g, "").length <= 2) tokens = tokens.slice(1);
  while (tokens.length > 1 && tokens[tokens.length - 1].length <= 1) tokens = tokens.slice(0, -1);
  const name = tokens.join(" ").replace(/^[\s\-:.]+|[\s\-:.]+$/g, "");
  return LETTER_RE.test(name) ? name : "";
}

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

type Draft = {
  date: string;
  cents: number;
  sign: 1 | -1;
  name: string;
  declined: boolean;
  warnings: ParseWarning[];
};

export function parseMonobankScreenshot(lines: string[], today = todayISO()): ParsedRow[] {
  const drafts: Draft[] = [];
  let date: { iso: string; relative: boolean } | null = null;
  let pendingName = ""; // payee line whose amount OCR put on the following line

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const header = parseMonoDateHeader(line, today);
    if (header) {
      date = header;
      pendingName = "";
      continue;
    }
    if (!date) continue; // status bar, card, balance — above the first date header

    if (DECLINED_RE.test(line)) {
      const last = drafts[drafts.length - 1];
      if (last) last.declined = true;
      pendingName = "";
      continue;
    }

    const amount = AMOUNT_RE.exec(line);
    if (!amount) {
      // Payee line (its amount follows) — unless it's a promo subtitle.
      if (!PROMO_RE.test(line)) pendingName = cleanPayee(line);
      continue;
    }

    const textPart = line.slice(0, amount.index);
    const promo = PROMO_RE.test(textPart);
    // The payee is on this line, unless this is the subtitle line under it.
    const name = pendingName && (promo || !cleanPayee(textPart)) ? pendingName : cleanPayee(textPart) || pendingName;
    const cents = Number(amount[3].replace(/\D/g, "")) * 100 + Number(amount[4]);
    pendingName = "";
    if (!cents) continue;

    const warnings: ParseWarning[] = date.relative ? ["relativeDate"] : [];
    const signChar = amount[2];
    let sign: 1 | -1;
    if (signChar === "+") sign = 1;
    else if (signChar && signChar !== ",") sign = -1; // "-", "−", "–", "‚" (misread minus)
    else if (promo) {
      sign = -1; // purchases carry the promo subtitle; OCR dropped the minus
      warnings.push("signGuessed");
    } else sign = 1; // mono shows incoming money without a sign

    drafts.push({ date: date.iso, cents, sign, name, declined: false, warnings });
  }

  return drafts
    .filter((d) => !d.declined)
    .map((d) => {
      const warnings = [...d.warnings];
      if (!d.name) warnings.push("noDescription");
      const penalty =
        (d.name ? 0 : 0.2) +
        (warnings.includes("relativeDate") ? 0.1 : 0) +
        (warnings.includes("signGuessed") ? 0.35 : 0);
      return {
        date: d.date,
        amount_cents: d.sign * d.cents,
        description: d.name,
        merchant: d.name || null,
        confidence: Math.max(0, Math.round((0.85 - penalty) * 100) / 100),
        warnings,
        transfer: OWN_TRANSFER_RE.test(d.name),
      };
    });
}

export const monobankScreenshotParser: StatementParser = {
  id: "monobank-screenshot",
  name: "monobank (screenshot)",
  detect(doc: ExtractedDocument) {
    if (doc.kind !== "text") return 0;
    const today = todayISO();
    const headers = doc.lines.filter((l) => parseMonoDateHeader(l.replace(/\s+/g, " "), today)).length;
    const amounts = doc.lines.filter((l) => AMOUNT_RE.test(l.trim())).length;
    return headers >= 1 && amounts >= 2 ? 0.7 : 0;
  },
  parse: (doc) => (doc.kind === "text" ? parseMonobankScreenshot(doc.lines) : []),
};
