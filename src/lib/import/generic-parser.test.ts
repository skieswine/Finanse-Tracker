import { describe, expect, it } from "vitest";
import { genericParser } from "./parsers/generic";
import { findAmounts, guessMerchant, parseGermanDate } from "./german";
import { LOW_CONFIDENCE, type ExtractedDocument } from "./types";

const table = (csv: string, delimiter = ";"): ExtractedDocument => ({
  kind: "table",
  rows: csv
    .trim()
    .split("\n")
    .map((line) => line.split(delimiter).map((c) => c.replace(/^"|"$/g, ""))),
});
const text = (s: string): ExtractedDocument => ({ kind: "text", lines: s.trim().split("\n") });
const parse = (doc: ExtractedDocument) => genericParser.parse(doc);

describe("parseGermanDate", () => {
  it("parses DD.MM.YYYY, DD.MM.YY, single digits and ISO", () => {
    expect(parseGermanDate("14.10.2026")).toEqual({ iso: "2026-10-14", yearGuessed: false });
    expect(parseGermanDate("14.10.26")).toEqual({ iso: "2026-10-14", yearGuessed: false });
    expect(parseGermanDate("4.1.2026")?.iso).toBe("2026-01-04");
    expect(parseGermanDate("2026-10-14")?.iso).toBe("2026-10-14");
  });

  it("uses the fallback year for DD.MM. and flags it", () => {
    expect(parseGermanDate("14.10.", 2026)).toEqual({ iso: "2026-10-14", yearGuessed: true });
    expect(parseGermanDate("14.10.")).toBeNull();
  });

  it("rejects impossible dates and non-dates", () => {
    expect(parseGermanDate("31.02.2026")).toBeNull();
    expect(parseGermanDate("REWE")).toBeNull();
    expect(parseGermanDate("1.234,56")).toBeNull();
  });
});

describe("findAmounts", () => {
  it("reads German amounts with signs, trailing minus and Soll/Haben", () => {
    expect(findAmounts("REWE -23,45")[0]).toMatchObject({ cents: 2345, sign: -1 });
    expect(findAmounts("Miete 1.250,00-")[0]).toMatchObject({ cents: 125000, sign: -1 });
    expect(findAmounts("Gehalt +2.890,12 EUR")[0]).toMatchObject({ cents: 289012, sign: 1 });
    expect(findAmounts("Netflix 12,99 S")[0]).toMatchObject({ cents: 1299, sign: -1 });
    expect(findAmounts("Erstattung 5,00 H")[0]).toMatchObject({ cents: 500, sign: 1 });
    expect(findAmounts("Kaffee 3,50 €")[0]).toMatchObject({ cents: 350, sign: null });
  });

  it("does not mistake dates or IDs for amounts", () => {
    expect(findAmounts("14.10.2026 Referenz 123456789")).toEqual([]);
  });
});

describe("guessMerchant", () => {
  it("strips booking words and references", () => {
    expect(guessMerchant("SEPA-Lastschrift REWE Markt GmbH//Berlin/DE EREF: 123")).toBe("REWE Markt GmbH");
    expect(guessMerchant("Kartenzahlung girocard LIDL DIENSTL 14.10 12:31")).toBe("LIDL DIENSTL");
    expect(guessMerchant("Überweisung Netflix International B.V.")).toBe("Netflix International B.V.");
  });
});

describe("generic parser — CSV tables", () => {
  it("ING-style export with account preamble and Saldo column", () => {
    const rows = parse(
      table(`
Umsatzanzeige;Datei erstellt am: 14.10.2026 10:00
IBAN;DE12 5001 0517 0000 0000 00
Kontoname;Girokonto
;
Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag;Währung
14.10.2026;14.10.2026;REWE Markt GmbH;Lastschrift;REWE SAGT DANKE 123;1.234,56;EUR;-23,45;EUR
13.10.2026;13.10.2026;Arbeitgeber AG;Gehalt/Rente;Gehalt Oktober;1.258,01;EUR;2.890,12;EUR
`),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2026-10-14",
      amount_cents: -2345,
      merchant: "REWE Markt GmbH",
      description: "Lastschrift REWE SAGT DANKE 123",
      confidence: 1,
      warnings: [],
    });
    expect(rows[1]).toMatchObject({ date: "2026-10-13", amount_cents: 289012, merchant: "Arbeitgeber AG" });
  });

  it("DKB-style export picks payee for expenses and payer for income", () => {
    const rows = parse(
      table(`
"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"
"02.10.26";"02.10.26";"Gebucht";"Max Mustermann";"Spotify AB";"Spotify Premium";"Ausgang";"SE00";"-10,99";"";"";""
"01.10.26";"01.10.26";"Gebucht";"Mama";"Max Mustermann";"Geburtstag";"Eingang";"DE00";"50";"";"";""
`),
    );
    expect(rows.map((r) => [r.date, r.amount_cents, r.merchant])).toEqual([
      ["2026-10-02", -1099, "Spotify AB"],
      ["2026-10-01", 5000, "Mama"],
    ]);
  });

  it("Sparkasse-style export ignores 'Ursprungsbetrag' and uses Betrag", () => {
    const rows = parse(
      table(`
"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE00";"05.10.26";"05.10.26";"FOLGELASTSCHRIFT";"Vodafone Rechnung 10/2026";"DE99";"M1";"";"";"";"";"Vodafone GmbH";"DE11";"BIC";"-39,99";"EUR";"Umsatz gebucht"
`),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount_cents: -3999, merchant: "Vodafone GmbH", date: "2026-10-05" });
  });

  it("N26-style export with ISO dates and dot decimals", () => {
    const rows = parse(
      table(
        `
"Date","Payee","Account number","Transaction type","Payment reference","Amount (EUR)","Amount (Foreign Currency)","Type Foreign Currency","Exchange Rate"
"2026-10-03","Amazon","","MasterCard Payment","","-34.9","","",""
"2026-10-01","Employer GmbH","DE00","Income","Salary","2500.0","","",""
`,
        ",",
      ),
    );
    expect(rows.map((r) => [r.date, r.amount_cents, r.merchant])).toEqual([
      ["2026-10-03", -3490, "Amazon"],
      ["2026-10-01", 250000, "Employer GmbH"],
    ]);
  });

  it("separate Soll / Haben columns", () => {
    const rows = parse(
      table(`
Datum;Buchungstext;Soll;Haben
07.10.2026;Bäckerei Müller;4,20;
08.10.2026;Rückzahlung Freund;;15,00
`),
    );
    expect(rows.map((r) => r.amount_cents)).toEqual([-420, 1500]);
  });

  it("Betrag plus S/H indicator column", () => {
    const rows = parse(
      table(`
Buchungstag;Text;Betrag;S/H
09.10.2026;Tankstelle Aral;65,00;S
10.10.2026;Erstattung Krankenkasse;80,00;H
`),
    );
    expect(rows.map((r) => r.amount_cents)).toEqual([-6500, 8000]);
  });

  it("guesses signs (flagged, low confidence) when the bank prints only absolute amounts", () => {
    const rows = parse(
      table(`
Datum;Beschreibung;Betrag
01.10.2026;Gehalt Oktober;2.000,00
02.10.2026;REWE;30,00
03.10.2026;Kino;12,00
`),
    );
    expect(rows.map((r) => r.amount_cents)).toEqual([200000, -3000, -1200]);
    expect(rows.every((r) => r.warnings.includes("signGuessed"))).toBe(true);
    expect(rows.every((r) => r.confidence < LOW_CONFIDENCE)).toBe(true);
  });

  it("falls back to heuristics when there is no header row", () => {
    const rows = parse(
      table(`
14.10.2026;Edeka Center;-18,40
15.10.2026;Gutschrift Zinsen;1,23
`),
    );
    expect(rows.map((r) => [r.date, r.amount_cents])).toEqual([
      ["2026-10-14", -1840],
      ["2026-10-15", 123],
    ]);
    expect(rows[0].warnings).toContain("noHeader");
    expect(rows[1].warnings).toContain("signGuessed");
  });

  it("skips rows without a valid date or amount", () => {
    const rows = parse(
      table(`
Buchungstag;Verwendungszweck;Betrag
14.10.2026;REWE;-5,00
;Vorgemerkte Umsätze;
Summe;;-5,00
`),
    );
    expect(rows).toHaveLength(1);
  });
});

describe("generic parser — PDF / OCR text lines", () => {
  const statement = `
Kontoauszug Nr. 10/2026   Girokonto   Seite 1
Buchung Valuta Vorgang Betrag
Alter Kontostand vom 30.09.2026 1.500,00 H
01.10. 01.10. Lastschrift REWE Markt GmbH 23,45 S
Berlin EREF 0001
02.10. 02.10. Gutschrift Arbeitgeber AG Gehalt 2.890,12 H
03.10. 03.10. Kartenzahlung NETFLIX.COM -12,99
05.10. 05.10. Dauerauftrag Miete Oktober 950,00
Neuer Kontostand vom 31.10.2026 3.403,68 H
`;
  const rows = parse(text(statement));

  it("finds every booking and skips balance lines", () => {
    expect(rows.map((r) => [r.date, r.amount_cents])).toEqual([
      ["2026-10-01", -2345],
      ["2026-10-02", 289012],
      ["2026-10-03", -1299],
      ["2026-10-05", -95000],
    ]);
  });

  it("joins continuation lines into the description", () => {
    expect(rows[0].description).toBe("Lastschrift REWE Markt GmbH Berlin EREF 0001");
    expect(rows[0].merchant).toBe("REWE Markt GmbH");
  });

  it("flags inferred years and guessed signs", () => {
    expect(rows[0].warnings).toEqual(["yearGuessed"]);
    expect(rows[3].warnings).toEqual(["yearGuessed", "signGuessed"]);
    expect(rows[3].confidence).toBeLessThan(LOW_CONFIDENCE);
  });

  it("prefers the amount with an explicit sign over a trailing balance", () => {
    const [row] = parse(text("14.10.2026 Amazon EU 34,90- 1.200,00"));
    expect(row.amount_cents).toBe(-3490);
  });

  it("parses full-year dates with value date and trailing minus", () => {
    const [row] = parse(text("14.10.2026 15.10.2026 SEPA-Lastschrift Telekom 1.049,99-"));
    expect(row).toMatchObject({ date: "2026-10-14", amount_cents: -104999, warnings: [] });
  });
});

describe("generic parser — Sparkasse PDF style", () => {
  // Debits carry "-", credits are unsigned; long descriptions with value dates and card data.
  const rows = parse(
    text(`
Kontoauszug 1/2026
02.01.2026 Gutschrift Überw. / Wert: 31.12.2025 Erika Musterfrau Miete Anteil 18,00
02.01.2026 Echtzeit-Überweisung / Wert: 31.12.2025 Max Mustermann Sparen -14,99
05.01.2026 KartenzahlgDebitkarte ROSSMANN//Dortmund/DE 2026-01-03T14:22:01 Folgenr. 00 Verfalld. 2028-12 -3,48
05.01.2026 KartenzahlgDebitkarte 01079 MCDONALDS//BERLIN/DE 2026-01-04T12:01:00 -3,00
02.01.2026 Lastschrift Dortmunder Stadtwerke Aktiengesellschaft EREF: 123456 MREF: ABC -53,00
`),
  );

  it("treats unsigned amounts as credits when debits are marked with '-'", () => {
    expect(rows.map((r) => r.amount_cents)).toEqual([1800, -1499, -348, -300, -5300]);
    expect(rows.every((r) => !r.warnings.includes("signGuessed"))).toBe(true);
  });

  it("extracts short merchant names from Sparkasse abbreviations", () => {
    expect(rows.map((r) => r.merchant)).toEqual([
      "Erika Musterfrau Miete",
      "Max Mustermann Sparen",
      "ROSSMANN",
      "MCDONALDS",
      "Dortmunder Stadtwerke Aktiengesellschaft",
    ]);
  });

  it("drops value dates, card timestamps and references from descriptions", () => {
    expect(rows[0].description).toBe("Gutschrift Überw. Erika Musterfrau Miete Anteil");
    expect(rows[2].description).toBe("KartenzahlgDebitkarte ROSSMANN//Dortmund/DE");
    expect(rows[4].description).toBe("Lastschrift Dortmunder Stadtwerke Aktiengesellschaft");
  });
});
