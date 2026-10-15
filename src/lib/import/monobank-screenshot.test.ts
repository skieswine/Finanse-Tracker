import { describe, expect, it } from "vitest";
import {
  cleanPayee,
  monobankScreenshotParser,
  parseMonoDateHeader,
  parseMonobankScreenshot,
} from "./parsers/monobank-screenshot";
import { pickParser } from "./registry";

// Shaped exactly like real Tesseract output of monobank screenshots (dark mode):
// icon junk, "₴" read as "2"/"8", "Від:" read as "Bin:", amounts on the subtitle
// line, a lost minus. Amounts are altered (not the user's real data).
const TODAY = "2026-10-15";
const screenshot1 = `
11:33. п: т Є
X - Q
169.12 2
Вчора
Lv) © eBpubul Rapin гомом я
13 жовтня
Steam =
“a W Підкинемо картці настрою? -116.00 2
ГИ Від: MONOBANK 30.00 2
Steam a
“a W Баланс міні. Додати? -116.00 2
ги З єврової картки 150.50 2
Steam a
“a W Підкинемо картці настрою? -91.00 2
EZ З єврової картки 150.50 2
12 жовтня
Steam =
a З Поповнимо для спокою? -100.00 2
ГИ Bin: MONOBANK 90.00 8
`.split("\n");

const screenshot2 = `
11:33 п т ЄВ
X - Q
169.128
Сьогодні
ГИ Bin: MONOBANK 60.00 2
Що) Dom | ‚60.00 2
Ф недостатньо коштів Ha картці
Вчора
Steam =
SZ W Баланс схуд. Підгодуємо? -116.00 2
ГИ Bin: MONOBANK 101.00 2
Steam a
a W Невеличкий буст балансу? -40.00 2
ГИ Від: MONOBANK 52.00 2
Steam a
“a З Невеличкий буст балансу? 46.00 2
Sr Steam -351.89 2
W Продавець показав суму в...
ги З єврової картки 454.50 2
`.split("\n");

describe("parseMonoDateHeader", () => {
  it("understands today, yesterday and Ukrainian month names", () => {
    expect(parseMonoDateHeader("Сьогодні", TODAY)).toEqual({ iso: "2026-10-15", relative: true });
    expect(parseMonoDateHeader("Вчора", TODAY)).toEqual({ iso: "2026-10-14", relative: true });
    expect(parseMonoDateHeader("13 жовтня", TODAY)).toEqual({ iso: "2026-10-13", relative: false });
    expect(parseMonoDateHeader("1 березня 2025", TODAY)?.iso).toBe("2025-03-01");
  });

  it("puts a future day-month into last year and crosses month boundaries", () => {
    expect(parseMonoDateHeader("28 грудня", TODAY)?.iso).toBe("2025-12-28");
    expect(parseMonoDateHeader("Вчора", "2026-03-01")?.iso).toBe("2026-02-28");
  });
});

describe("cleanPayee", () => {
  it("removes icon junk and fixes OCR confusions", () => {
    expect(cleanPayee("ГИ Bin: MONOBANK")).toBe("Від: MONOBANK");
    expect(cleanPayee("Sr Steam")).toBe("Steam");
    expect(cleanPayee("Steam a")).toBe("Steam");
    expect(cleanPayee("Steam =")).toBe("Steam");
    expect(cleanPayee("ги З єврової картки")).toBe("З єврової картки");
  });
});

describe("monobank screenshot parser (real OCR shape)", () => {
  it("is picked over the generic parser", () => {
    expect(pickParser({ kind: "text", lines: screenshot1 }).id).toBe(monobankScreenshotParser.id);
  });

  it("reads screenshot 1: payee from the line above the amount, dates from headers", () => {
    const rows = parseMonobankScreenshot(screenshot1, TODAY);
    expect(rows.map((r) => [r.date, r.amount_cents, r.merchant])).toEqual([
      ["2026-10-13", -11600, "Steam"],
      ["2026-10-13", 3000, "Від: MONOBANK"],
      ["2026-10-13", -11600, "Steam"],
      ["2026-10-13", 15050, "З єврової картки"],
      ["2026-10-13", -9100, "Steam"],
      ["2026-10-13", 15050, "З єврової картки"],
      ["2026-10-12", -10000, "Steam"],
      ["2026-10-12", 9000, "Від: MONOBANK"],
    ]);
  });

  it("ignores balance/status bar and the half-cut row with no amount", () => {
    const rows = parseMonobankScreenshot(screenshot1, TODAY);
    expect(rows.some((r) => r.amount_cents === 16912)).toBe(false);
    expect(rows.some((r) => r.date === "2026-10-14")).toBe(false);
  });

  it("reads screenshot 2: drops the declined payment, recovers a lost minus", () => {
    const rows = parseMonobankScreenshot(screenshot2, TODAY);
    expect(rows.map((r) => [r.date, r.amount_cents, r.merchant])).toEqual([
      ["2026-10-15", 6000, "Від: MONOBANK"],
      ["2026-10-14", -11600, "Steam"],
      ["2026-10-14", 10100, "Від: MONOBANK"],
      ["2026-10-14", -4000, "Steam"],
      ["2026-10-14", 5200, "Від: MONOBANK"],
      ["2026-10-14", -4600, "Steam"], // "46.00" on a promo line → debit, flagged
      ["2026-10-14", -35189, "Steam"],
      ["2026-10-14", 45450, "З єврової картки"],
    ]);
    const guessed = rows.find((r) => r.amount_cents === -4600)!;
    expect(guessed.warnings).toContain("signGuessed");
    expect(guessed.confidence).toBeLessThan(0.7);
    expect(rows[0].warnings).toContain("relativeDate");
  });

  it("marks transfers between own cards; promo text never becomes a description", () => {
    const rows = parseMonobankScreenshot([...screenshot1, ...screenshot2], TODAY);
    expect(rows.filter((r) => r.transfer).map((r) => r.merchant)).toEqual([
      "З єврової картки",
      "З єврової картки",
      "З єврової картки",
    ]);
    expect(rows.every((r) => !/\?|Підкинемо|Баланс|буст/.test(r.description))).toBe(true);
  });
});
