// CSV export in the format German Excel expects (";" separator, decimal comma,
// UTF-8 with BOM). Headers are German on purpose: the generic import parser
// recognises them, so an export doubles as a re-importable backup.

import { centsToInput } from "./money";

export type ExportRow = {
  date: string; // YYYY-MM-DD
  amount_cents: number;
  description: string;
  merchant: string | null;
  category: string;
  type: string;
  account: string;
  note: string | null;
};

export const CSV_HEADERS = ["Datum", "Betrag", "Beschreibung", "Empfänger", "Kategorie", "Typ", "Konto", "Notiz"];

/** Quote a text cell; neutralise spreadsheet formulas (CSV injection). */
export function csvText(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function germanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function toCsv(rows: readonly ExportRow[]): string {
  const lines = [CSV_HEADERS.join(";")];
  for (const r of rows) {
    lines.push(
      [
        germanDate(r.date),
        centsToInput(r.amount_cents),
        csvText(r.description),
        csvText(r.merchant),
        csvText(r.category),
        csvText(r.type),
        csvText(r.account),
        csvText(r.note),
      ].join(";"),
    );
  }
  // Byte-order mark so Excel detects UTF-8 (umlauts, Cyrillic).
  return String.fromCharCode(0xfeff) + lines.join("\r\n") + "\r\n";
}
