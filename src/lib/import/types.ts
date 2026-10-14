// Statement import pipeline (all client-side):
//   File → extract (csv/pdf/docx/image) → ExtractedDocument
//        → StatementParser → ParsedRow[] → rules → review → save

export type SourceFileType = "csv" | "pdf" | "docx" | "image";

/** Output of an extractor: either cells (CSV, DOCX tables) or plain lines. */
export type ExtractedDocument =
  | { kind: "table"; rows: string[][] }
  | { kind: "text"; lines: string[] };

/** Why a row got a lower confidence; shown on the review screen. */
export type ParseWarning =
  | "signGuessed" // no sign / Soll-Haben marker found; guessed from keywords
  | "yearGuessed" // date had no year; inferred from the statement
  | "noDescription"
  | "noHeader"; // table without a recognisable header row

export type ParsedRow = {
  date: string; // YYYY-MM-DD
  amount_cents: number; // signed: + income, − outflow
  description: string;
  merchant: string | null;
  /** 0..1 — rows below LOW_CONFIDENCE are highlighted for review. */
  confidence: number;
  warnings: ParseWarning[];
};

export const LOW_CONFIDENCE = 0.7;

/**
 * A bank-specific or generic parser. To add a bank: implement this,
 * register it in ./registry.ts. `detect` returns 0..1 — the highest wins.
 */
export interface StatementParser {
  id: string;
  name: string;
  detect(doc: ExtractedDocument): number;
  parse(doc: ExtractedDocument): ParsedRow[];
}
