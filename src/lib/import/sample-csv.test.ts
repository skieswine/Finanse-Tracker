import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { decodeText, detectDelimiter } from "./extract";
import { genericParser } from "./parsers/generic";

// End-to-end on samples/beispiel-girokonto.csv (Windows-1252, ING-style).
describe("sample CSV (Windows-1252)", () => {
  const bytes = readFileSync("samples/beispiel-girokonto.csv");
  const text = decodeText(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const rows = Papa.parse<string[]>(text, { delimiter: detectDelimiter(text), skipEmptyLines: "greedy" }).data;
  const parsed = genericParser.parse({ kind: "table", rows });

  it("decodes umlauts", () => {
    expect(text).toContain("Auftraggeber/Empfänger");
    expect(text).toContain("Hausverwaltung Müller");
  });

  it("parses all 8 bookings with correct signs and merchants", () => {
    expect(parsed).toHaveLength(8);
    expect(parsed[0]).toMatchObject({ date: "2026-10-01", amount_cents: 285000, merchant: "Arbeitgeber GmbH" });
    expect(parsed[1]).toMatchObject({ amount_cents: -95000, merchant: "Hausverwaltung Müller" });
    expect(parsed.every((r) => r.confidence === 1)).toBe(true);
  });
});

describe("detectDelimiter", () => {
  it("prefers ; and tab over the decimal comma", () => {
    expect(detectDelimiter("a;b;1.234,56\nc;d;2,00")).toBe(";");
    expect(detectDelimiter("a\tb\t1,00\nc\td\t2,00")).toBe("\t");
    expect(detectDelimiter('"Date","Payee","Amount"\n"2026-10-01","X","-1.5"')).toBe(",");
  });
});
