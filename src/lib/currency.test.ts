import { describe, expect, it } from "vitest";
import { formatMoney, formatRate, isCurrency, toEurCents } from "./currency";

describe("currency helpers", () => {
  it("converts original cents to EUR cents at a per-EUR rate", () => {
    expect(toEurCents(-50000, 49.5794)).toBe(-1008); // −500 ₴ ≈ −10,08 €
    expect(toEurCents(1166, 1.1664)).toBe(1000); // 11,66 $ ≈ 10 €
    expect(toEurCents(-4218, 4.2178)).toBe(-1000);
  });

  it("formats amounts with the narrow symbol in de-DE style", () => {
    expect(formatMoney(-50000, "UAH")).toMatch(/^-500,00\s₴$/);
    expect(formatMoney(123456, "USD")).toMatch(/^1\.234,56\s\$$/);
    expect(formatMoney(-2345, "PLN", { signed: true })).toMatch(/^-23,45\szł$/);
    expect(formatMoney(150056, "EUR", { whole: true })).toMatch(/^1\.501\s€$/);
  });

  it("formats rates and validates codes", () => {
    expect(formatRate(49.5794, "UAH")).toBe("1 € = 49,5794 ₴");
    expect(isCurrency("UAH")).toBe(true);
    expect(isCurrency("GBP")).toBe(false);
  });
});
