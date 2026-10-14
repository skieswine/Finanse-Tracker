import "server-only";
import { z } from "zod";
import { todayISO } from "./dates";
import { BASE_CURRENCY, type Currency } from "./currency";

// Exchange rates (units of currency per 1 EUR), free and keyless:
//   UAH → National Bank of Ukraine (official rate for every calendar day)
//   USD, PLN, … → European Central Bank via api.frankfurter.dev
//                 (weekends/holidays return the last business day)
// Only "currency + date" is sent — never any transaction data.

const ONE_DAY = 60 * 60 * 24;

const nbuSchema = z.array(z.object({ rate: z.number().positive(), cc: z.string() })).min(1);
const ecbSchema = z.object({ rates: z.record(z.string(), z.number().positive()) });

// Historical rates never change: cache per server instance as well as via fetch cache.
const memo = new Map<string, number>();

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(6000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`FX ${response.status}`);
  return response.json();
}

/** Units of `currency` per 1 EUR on `date` (YYYY-MM-DD), or null if unavailable. */
export async function getRate(currency: Currency, date: string): Promise<number | null> {
  if (currency === BASE_CURRENCY) return 1;
  const today = todayISO();
  const day = date > today ? today : date; // no rates for future dates yet
  const key = `${currency}|${day}`;
  const cached = memo.get(key);
  if (cached) return cached;

  // Today's rate may still be published later; past rates are final.
  const revalidate = day === today ? ONE_DAY / 24 : ONE_DAY * 365;
  try {
    let rate: number | undefined;
    if (currency === "UAH") {
      const data = nbuSchema.parse(
        await fetchJson(
          `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&date=${day.replaceAll("-", "")}&json`,
          revalidate,
        ),
      );
      rate = data[0].rate;
    } else {
      const data = ecbSchema.parse(
        await fetchJson(`https://api.frankfurter.dev/v1/${day}?base=EUR&symbols=${currency}`, revalidate),
      );
      rate = data.rates[currency];
    }
    if (!rate) return null;
    memo.set(key, rate);
    return rate;
  } catch {
    return null;
  }
}

/** Rates for many dates at once (imports), de-duplicated. */
export async function getRates(currency: Currency, dates: readonly string[]): Promise<Map<string, number | null>> {
  const unique = [...new Set(dates)];
  const results = await Promise.all(unique.map((d) => getRate(currency, d)));
  return new Map(unique.map((d, i) => [d, results[i]]));
}
