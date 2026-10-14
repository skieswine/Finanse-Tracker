"use server";

import { isCurrency } from "@/lib/currency";
import { isISODate } from "@/lib/dates";
import { getRate } from "@/lib/fx";
import { authedClient } from "./shared";

/** Rate preview for the transaction form (units of `currency` per 1 EUR). */
export async function previewRate(currency: string, date: string): Promise<number | null> {
  if (!isCurrency(currency) || !isISODate(date)) return null;
  await authedClient();
  return getRate(currency, date);
}
