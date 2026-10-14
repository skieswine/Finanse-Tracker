import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { csvText, toCsv } from "./csv-export";
import { detectDelimiter } from "./import/extract";
import { genericParser } from "./import/parsers/generic";

const rows = [
  {
    date: "2026-10-03",
    amount_cents: -2345,
    description: 'REWE "Markt"; Berlin',
    merchant: "REWE Markt GmbH",
    category: "Lebensmittel",
    type: "Витрата",
    account: "Girokonto",
    note: null,
    currency: "EUR",
    original_cents: null,
    fx_rate: null,
  },
  {
    date: "2026-10-01",
    amount_cents: 285000,
    description: "Gehalt Oktober",
    merchant: "Arbeitgeber GmbH",
    category: "Gehalt",
    type: "Дохід",
    account: "Monobank",
    note: "=HYPERLINK()",
    currency: "UAH",
    original_cents: 14131000,
    fx_rate: 49.5794,
  },
];

describe("csvText", () => {
  it("quotes, escapes quotes and neutralises formulas", () => {
    expect(csvText('a "b"')).toBe('"a ""b"""');
    expect(csvText("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvText(null)).toBe('""');
  });
});

describe("toCsv", () => {
  const csv = toCsv(rows);

  it("starts with a BOM and German headers, uses ; and decimal commas", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split("\r\n")[0]).toBe("Datum;Betrag;Beschreibung;Empfänger;Kategorie;Typ;Konto;Notiz;Währung;Originalbetrag;Kurs");
    expect(csv).toContain("03.10.2026;-23,45;");
    expect(csv).toContain("01.10.2026;2850,00;");
    expect(csv).toContain(";UAH;141310,00;49,5794");
  });

  it("round-trips through the importer", () => {
    const text = csv.slice(1);
    const table = Papa.parse<string[]>(text, { delimiter: detectDelimiter(text), skipEmptyLines: "greedy" }).data;
    const parsed = genericParser.parse({ kind: "table", rows: table });
    expect(parsed.map((r) => [r.date, r.amount_cents, r.merchant])).toEqual([
      ["2026-10-03", -2345, "REWE Markt GmbH"],
      ["2026-10-01", 285000, "Arbeitgeber GmbH"],
    ]);
  });
});
