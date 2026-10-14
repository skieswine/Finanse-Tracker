import type { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv-export";
import { getAccounts, getCategories, getTransactionsForExport } from "@/lib/data";
import { isISODate } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n/server";
import { classify, kindMap } from "@/lib/summary";
import { createClient } from "@/lib/supabase/server";

/** GET /reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD → CSV (no params = everything). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return new Response("Unauthorized", { status: 401 });

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const range = isISODate(from) && isISODate(to) ? { from, to } : null;

  const [t, categories, accounts, transactions] = await Promise.all([
    getDictionary(),
    getCategories(),
    getAccounts(),
    getTransactionsForExport(range?.from, range?.to),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const kinds = kindMap(categories);

  const csv = toCsv(
    transactions.map((tx) => ({
      date: tx.date,
      amount_cents: tx.amount_cents,
      description: tx.description,
      merchant: tx.merchant,
      category: tx.category_id ? (categoryById.get(tx.category_id)?.name ?? "") : "",
      type: t.txTypes[classify(tx, kinds)],
      account: tx.account_id ? (accountById.get(tx.account_id)?.name ?? "") : "",
      note: tx.note,
    })),
  );

  const fileName = range ? `finanzen_${range.from}_${range.to}.csv` : "finanzen_alle.csv";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
