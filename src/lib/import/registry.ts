import { genericParser } from "./parsers/generic";
import type { ExtractedDocument, StatementParser } from "./types";

/**
 * All available parsers. To support a specific bank, add a parser whose
 * detect() returns > 0.1 for that bank's format (e.g. by checking the
 * header row) — it will then win over the generic one.
 */
export const PARSERS: StatementParser[] = [genericParser];

export function pickParser(doc: ExtractedDocument): StatementParser {
  let best = genericParser;
  let bestScore = -1;
  for (const parser of PARSERS) {
    const score = parser.detect(doc);
    if (score > bestScore) {
      best = parser;
      bestScore = score;
    }
  }
  return best;
}
