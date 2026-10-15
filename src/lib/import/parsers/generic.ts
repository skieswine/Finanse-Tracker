// Generic parser: works on any statement via date + amount + description
// heuristics. Bank-specific parsers can beat it via a higher detect() score.

import { parseAmountToCents } from "@/lib/money";
import {
  SUMMARY_LINE_RE,
  cleanDescription,
  findAmounts,
  guessMerchant,
  guessSign,
  inferStatementYear,
  normalizeHeader,
  parseGermanDate,
} from "../german";
import type { ExtractedDocument, ParseWarning, ParsedRow, StatementParser } from "../types";

const PENALTY: Record<ParseWarning, number> = {
  signGuessed: 0.35,
  yearGuessed: 0.2,
  noDescription: 0.2,
  noHeader: 0.15,
  relativeDate: 0.1,
};

function makeRow(
  base: { date: string; amount_cents: number; description: string; merchant: string | null },
  warnings: ParseWarning[],
  baseConfidence = 1,
): ParsedRow {
  const description = cleanDescription(base.description);
  const all: ParseWarning[] = description ? warnings : [...warnings, "noDescription"];
  const confidence = all.reduce((c, w) => c - PENALTY[w], baseConfidence);
  return {
    ...base,
    description,
    merchant: base.merchant?.trim() || guessMerchant(base.description),
    confidence: Math.max(0, Math.round(confidence * 100) / 100),
    warnings: all,
  };
}

// ---------------------------------------------------------------- tables

type Role = "date" | "amount" | "debit" | "credit" | "sh" | "description" | "merchant";

// Checked in this order; first match wins. Keywords are normalised (see normalizeHeader).
const ROLE_KEYWORDS: [Role, string[]][] = [
  ["sh", ["sh", "sollhaben"]],
  ["description", ["verwendungszweck", "buchungstext", "beschreibung", "vorgang", "umsatzart", "umsatztyp", "buchungsart", "transactiontype", "paymentreference", "details", "description", "text"]],
  ["merchant", ["beguenstigter", "zahlungspflichtig", "zahlungsempfaenger", "empfaenger", "auftraggeber", "glaeubiger", "gegenpartei", "payee", "name"]],
  ["debit", ["soll", "belastung", "ausgang", "abgang", "debit"]],
  ["credit", ["haben", "gutschrift", "eingang", "zugang", "credit"]],
  ["date", ["buchungstag", "buchungsdatum", "buchung", "datum", "date", "valuta", "wertstellung"]],
  ["amount", ["betrag", "umsatz", "amount", "summe"]],
];

// Never treat these as transaction columns.
const IGNORED_HEADER_RE =
  /saldo|kontostand|iban|kontonummer|accountnumber|auftragskonto|bic|blz|waehrung|currency|mandat|glaeubigerid|ursprung|original|auslagen|ruecklastschrift|kategorie|category|status/;

type Columns = Partial<Record<Exclude<Role, "description" | "merchant">, number>> & {
  description: number[];
  /** Some banks (DKB) have separate payer and payee columns. */
  merchant: { index: number; header: string }[];
};

function detectColumns(row: string[]): Columns | null {
  const cols: Columns = { description: [], merchant: [] };
  row.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h || IGNORED_HEADER_RE.test(h)) return;
    for (const [role, keywords] of ROLE_KEYWORDS) {
      if (!keywords.some((k) => (k.length <= 4 ? h === k : h.includes(k)))) continue;
      if (role === "description") cols.description.push(i);
      else if (role === "merchant") cols.merchant.push({ index: i, header: h });
      // Keep the first date column (booking date beats value date).
      else if (cols[role] === undefined) cols[role] = i;
      return;
    }
  });
  const hasAmount = cols.amount !== undefined || cols.debit !== undefined || cols.credit !== undefined;
  return cols.date !== undefined && hasAmount ? cols : null;
}

const cell = (row: string[], i: number | undefined) => (i === undefined ? "" : (row[i] ?? "").trim());

const PAYEE_HEADER_RE = /empfaeng|beguenstig|payee/;
const PAYER_HEADER_RE = /zahlungspflicht|auftraggeber/;

/** For an expense the payee is the merchant; for income, the payer. */
function pickMerchant(row: string[], cols: Columns, cents: number): string | null {
  const preferred = cents < 0 ? PAYEE_HEADER_RE : PAYER_HEADER_RE;
  const ordered = [...cols.merchant].sort(
    (a, b) => Number(preferred.test(b.header)) - Number(preferred.test(a.header)),
  );
  for (const m of ordered) {
    const value = cell(row, m.index);
    if (value) return value;
  }
  return null;
}

function parseTableWithHeader(rows: string[][], headerIndex: number, cols: Columns, year: number): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const date = parseGermanDate(cell(row, cols.date), year);
    if (!date) continue;

    let cents: number | null = null;
    if (cols.amount !== undefined) {
      cents = parseAmountToCents(cell(row, cols.amount));
      const sh = cell(row, cols.sh).toUpperCase();
      if (cents !== null && sh) cents = sh.startsWith("S") ? -Math.abs(cents) : Math.abs(cents);
    } else {
      const debit = parseAmountToCents(cell(row, cols.debit));
      const credit = parseAmountToCents(cell(row, cols.credit));
      if (debit) cents = -Math.abs(debit);
      else if (credit) cents = Math.abs(credit);
    }
    if (!cents) continue;

    const description = cols.description.map((i) => cell(row, i)).filter(Boolean).join(" ");
    const merchant = pickMerchant(row, cols, cents);
    const warnings: ParseWarning[] = date.yearGuessed ? ["yearGuessed"] : [];
    out.push(makeRow({ date: date.iso, amount_cents: cents, description, merchant }, warnings));
  }

  // A single "Betrag" column where nothing is ever negative means the bank
  // prints absolute values — fall back to keyword guessing, flagged.
  const unsigned =
    cols.amount !== undefined && cols.sh === undefined && out.length > 2 && out.every((r) => r.amount_cents > 0);
  if (unsigned) {
    return out.map((r) =>
      makeRow(
        { ...r, amount_cents: guessSign(r.description) * Math.abs(r.amount_cents) },
        [...r.warnings.filter((w) => w !== "noDescription"), "signGuessed"],
      ),
    );
  }
  return out;
}

const AMOUNT_CELL_RE = /^[+\-−]?\s?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})\s?(?:€|EUR)?\s?[+\-SH]?$|^-?\d+\.\d{1,2}$/;

/** No header: first date-like cell, last amount-like cell, rest is text. */
function parseTableHeuristically(rows: string[][], year: number): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const row of rows) {
    const cells = row.map((c) => c.trim());
    const dateIdx = cells.findIndex((c) => parseGermanDate(c, year));
    if (dateIdx < 0) continue;
    let amountIdx = -1;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (i !== dateIdx && AMOUNT_CELL_RE.test(cells[i])) {
        amountIdx = i;
        break;
      }
    }
    if (amountIdx < 0) continue;
    const date = parseGermanDate(cells[dateIdx], year)!;
    // German "12,50-" / "12,50 S" via findAmounts, international "-12.50" via parseAmountToCents.
    const german = findAmounts(cells[amountIdx])[0];
    const raw = german ? null : parseAmountToCents(cells[amountIdx]);
    const abs = german ? german.cents : Math.abs(raw ?? 0);
    if (!abs) continue;
    const statedSign = german ? german.sign : raw! < 0 ? -1 : null;
    const description = cells
      .filter((c, i) => i !== dateIdx && i !== amountIdx && c && !parseGermanDate(c) && !AMOUNT_CELL_RE.test(c))
      .join(" ");
    const cents = (statedSign ?? guessSign(description)) * abs;
    const warnings: ParseWarning[] = ["noHeader"];
    if (statedSign === null) warnings.push("signGuessed");
    if (date.yearGuessed) warnings.push("yearGuessed");
    out.push(makeRow({ date: date.iso, amount_cents: cents, description, merchant: null }, warnings));
  }
  return out;
}

function parseTable(rows: string[][]): ParsedRow[] {
  const year = inferStatementYear(rows.flat().join(" "));
  // German exports often start with several lines of account info.
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cols = detectColumns(rows[i]);
    if (cols) return parseTableWithHeader(rows, i, cols, year);
  }
  return parseTableHeuristically(rows, year);
}

// ---------------------------------------------------------------- text

// Booking date (+ optional value date) at the start of a line.
const LINE_DATE_RE = /^\s*(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})?)(?:\s+(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})?))?(?=\s|$)/;

/** PDF / DOCX / OCR lines: "14.10.2026 14.10.2026 REWE Markt Berlin -23,45". */
function parseText(lines: string[]): ParsedRow[] {
  const year = inferStatementYear(lines.join(" "));
  type Draft = {
    date: string;
    cents: number;
    /** Sign as printed, or null if the line had none. */
    statedSign: 1 | -1 | null;
    text: string;
    warnings: ParseWarning[];
    extra: number;
  };
  const drafts: Draft[] = [];
  let current: Draft | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (SUMMARY_LINE_RE.test(line)) {
      current = null;
      continue;
    }

    const dateMatch = LINE_DATE_RE.exec(line);
    const date = dateMatch ? parseGermanDate(dateMatch[1], year) : null;
    const rest = dateMatch ? line.slice(dateMatch[0].length) : line;
    const amounts = findAmounts(rest);

    if (date && amounts.length > 0) {
      // Prefer an amount that states its sign; otherwise the first one
      // (a trailing second amount is usually the running balance).
      const chosen = amounts.find((a) => a.sign !== null) ?? amounts[0];
      let text = rest;
      for (const a of [...amounts].reverse()) text = text.slice(0, a.index) + " " + text.slice(a.index + a.length);
      const warnings: ParseWarning[] = [];
      if (date.yearGuessed) warnings.push("yearGuessed");
      current = { date: date.iso, cents: chosen.cents, statedSign: chosen.sign, text, warnings, extra: 0 };
      drafts.push(current);
    } else if (current && !date && amounts.length === 0 && current.extra < 3) {
      // Continuation of the previous booking's description.
      current.text += ` ${line}`;
      current.extra++;
    } else {
      current = null;
    }
  }

  // Many banks (e.g. Sparkasse) print "-" only on debits, or "+" only on
  // credits. If the statement does that consistently, an unsigned amount
  // is the other direction — no guessing needed.
  const hasMinus = drafts.some((d) => d.statedSign === -1);
  const hasPlus = drafts.some((d) => d.statedSign === 1);
  const unsignedMeans: 1 | -1 | null = hasMinus && !hasPlus ? 1 : hasPlus && !hasMinus ? -1 : null;

  // Text extraction is less reliable than real columns.
  return drafts.map((d) => {
    let sign = d.statedSign ?? unsignedMeans;
    const warnings = [...d.warnings];
    if (sign === null) {
      sign = guessSign(d.text);
      warnings.push("signGuessed");
    }
    return makeRow(
      { date: d.date, amount_cents: sign * d.cents, description: d.text, merchant: null },
      warnings,
      0.95,
    );
  });
}

export const genericParser: StatementParser = {
  id: "generic",
  name: "Generic",
  detect: () => 0.1,
  parse: (doc: ExtractedDocument) => (doc.kind === "table" ? parseTable(doc.rows) : parseText(doc.lines)),
};
