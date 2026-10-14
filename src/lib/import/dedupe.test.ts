import { describe, expect, it } from "vitest";
import { dedupeHash, dedupeHashes, normalizeDescription } from "./dedupe";

const row = { date: "2026-10-14", amount_cents: -2345, description: "REWE Markt GmbH Berlin" };

describe("normalizeDescription", () => {
  it("ignores case, punctuation, accents and extra whitespace", () => {
    expect(normalizeDescription("  REWE-Markt   GmbH, Berlin ")).toBe("rewe markt gmbh berlin");
    expect(normalizeDescription("Bäckerei Müller Straße")).toBe("backerei muller strasse");
  });
});

describe("dedupeHash", () => {
  it("is a stable 64-char hex SHA-256", async () => {
    const hash = await dedupeHash(row);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await dedupeHash({ ...row })).toBe(hash);
  });

  it("matches the same booking even if formatting of the description differs", async () => {
    expect(await dedupeHash({ ...row, description: "rewe markt  gmbh, berlin" })).toBe(await dedupeHash(row));
  });

  it("differs when date, amount or description differ", async () => {
    const base = await dedupeHash(row);
    expect(await dedupeHash({ ...row, date: "2026-10-15" })).not.toBe(base);
    expect(await dedupeHash({ ...row, amount_cents: 2345 })).not.toBe(base);
    expect(await dedupeHash({ ...row, amount_cents: -2346 })).not.toBe(base);
    expect(await dedupeHash({ ...row, description: "LIDL Berlin" })).not.toBe(base);
  });
});

describe("dedupeHashes", () => {
  it("gives identical rows within one statement different hashes", async () => {
    const coffee = { date: "2026-10-14", amount_cents: -350, description: "Coffee Shop" };
    const [a, b, c] = await dedupeHashes([coffee, coffee, row]);
    expect(a).not.toBe(b);
    expect(c).toBe(await dedupeHash(row));
  });

  it("re-importing the same statement yields the same hashes", async () => {
    const coffee = { date: "2026-10-14", amount_cents: -350, description: "Coffee Shop" };
    const first = await dedupeHashes([coffee, row, coffee]);
    const second = await dedupeHashes([coffee, row, coffee]);
    expect(second).toEqual(first);
  });
});
