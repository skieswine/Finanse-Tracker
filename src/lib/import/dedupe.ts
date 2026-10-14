// dedupe_hash identifies "the same bank transaction" across imports.
// Input: date + amount + normalised description, plus an occurrence index so
// two genuinely identical rows in one statement (e.g. two coffees on the
// same day) get different hashes — and re-importing that statement matches
// both of them again.

type HashInput = { date: string; amount_cents: number; description: string };

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalizeDescription(description: string): string {
  return description
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupeKey(row: HashInput, occurrence = 0): string {
  return [row.date, row.amount_cents, normalizeDescription(row.description), occurrence].join("|");
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function dedupeHash(row: HashInput, occurrence = 0): Promise<string> {
  return sha256Hex(dedupeKey(row, occurrence));
}

/** Hashes for a whole batch, numbering repeated identical rows 0, 1, 2… */
export async function dedupeHashes(rows: readonly HashInput[]): Promise<string[]> {
  const seen = new Map<string, number>();
  return Promise.all(
    rows.map((row) => {
      const base = dedupeKey(row);
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      return dedupeHash(row, occurrence);
    }),
  );
}
