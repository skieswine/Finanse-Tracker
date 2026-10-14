import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  PiggyBank,
  Scale,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/empty-state";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultMonth, getCategories, getLatestTransactionMonth, getSummaryRowsBetween } from "@/lib/data";
import { addMonths, currentMonth, formatMonth, isMonthKey, monthEnd, monthStart, monthsBetween } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { byCategory, kindMap, monthlyTotals, totals, type TxClass } from "@/lib/summary";
import { NO_CATEGORY, filtersToQuery } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { RangePicker } from "./range-picker";

const MAX_RANGE_MONTHS = 120;
const CLASS_ORDER: Exclude<TxClass, "transfer">[] = ["income", "expense", "savings"];

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams;
  const period = params.period === "year" || params.period === "range" ? params.period : "month";
  const [fallbackMonth, latestMonth] = await Promise.all([defaultMonth(currentMonth()), getLatestTransactionMonth()]);
  const month = isMonthKey(params.month) ? params.month : fallbackMonth;
  const yearParam = Number(params.year);
  const year =
    Number.isInteger(yearParam) && yearParam > 1999 && yearParam < 2100
      ? yearParam
      : Number(fallbackMonth.slice(0, 4));

  // Custom range "YYYY-MM".."YYYY-MM"; defaults to Jan..latest month of that year.
  let rangeFrom = isMonthKey(params.from) ? params.from : `${fallbackMonth.slice(0, 4)}-01`;
  let rangeTo = isMonthKey(params.to) ? params.to : fallbackMonth;
  if (rangeFrom > rangeTo) [rangeFrom, rangeTo] = [rangeTo, rangeFrom];
  if (monthsBetween(rangeFrom, rangeTo) > MAX_RANGE_MONTHS) rangeFrom = addMonths(rangeTo, 1 - MAX_RANGE_MONTHS);

  const { from, to } =
    period === "month"
      ? { from: monthStart(month), to: monthEnd(month) }
      : period === "year"
        ? { from: `${year}-01-01`, to: `${year}-12-31` }
        : { from: monthStart(rangeFrom), to: monthEnd(rangeTo) };

  const [{ t, intlLocale }, categories] = await Promise.all([getI18n(), getCategories()]);
  const rows = await getSummaryRowsBetween(from, to, categories);
  const kinds = kindMap(categories);
  const sums = totals(rows, kinds);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const perCategory = byCategory(rows, kinds);
  const months =
    period === "year"
      ? monthlyTotals(rows, kinds, `${year}-12`, 12)
      : period === "range" && rangeFrom !== rangeTo
        ? monthlyTotals(rows, kinds, rangeTo, monthsBetween(rangeFrom, rangeTo))
        : [];
  const thisYear = Number(currentMonth().slice(0, 4));
  const pickerYears = Array.from({ length: 11 }, (_, i) => thisYear - 9 + i);

  const tab = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );
  const classTitle: Record<Exclude<TxClass, "transfer">, string> = {
    income: t.dashboard.income,
    expense: t.dashboard.expenses,
    savings: t.dashboard.savings,
  };

  return (
    <>
      <PageHeader title={t.nav.reports} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Link href={`/reports?period=month&month=${month}`} className={tab(period === "month")}>
            {t.reports.month}
          </Link>
          <Link href={`/reports?period=year&year=${year}`} className={tab(period === "year")}>
            {t.reports.year}
          </Link>
          <Link href={`/reports?period=range&from=${rangeFrom}&to=${rangeTo}`} className={tab(period === "range")}>
            {t.reports.range}
          </Link>
        </div>
        {period === "month" ? (
          <MonthSwitcher month={month} basePath="/reports" intlLocale={intlLocale} t={t} />
        ) : period === "range" ? (
          <RangePicker from={rangeFrom} to={rangeTo} years={pickerYears} />
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href={`/reports?period=year&year=${year - 1}`}
              aria-label={t.reports.prevYear}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ChevronLeft />
            </Link>
            <span className="min-w-20 text-center text-sm font-medium">{year}</span>
            <Link
              href={`/reports?period=year&year=${year + 1}`}
              aria-label={t.reports.nextYear}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ChevronRight />
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t.dashboard.income} cents={sums.income} icon={ArrowDownLeft} />
          <StatCard label={t.dashboard.expenses} cents={sums.expenses} icon={ArrowUpRight} />
          <StatCard label={t.dashboard.savings} cents={sums.savings} icon={PiggyBank} />
          <StatCard label={t.dashboard.net} cents={sums.net} icon={Scale} hint={t.dashboard.netHint} signed />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title={t.reports.empty}
            description={t.reports.emptyHint}
            action={
              latestMonth && (
                <Link
                  href={`/reports?period=month&month=${latestMonth}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {fmt(t.reports.goToLatest, { month: formatMonth(latestMonth, intlLocale) })}
                </Link>
              )
            }
          />
        ) : (
          <>
            {months.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.reports.byMonth}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm tabular-nums">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 font-medium">{t.reports.monthCol}</th>
                        <th className="py-2 text-right font-medium">{t.dashboard.income}</th>
                        <th className="py-2 text-right font-medium">{t.dashboard.expenses}</th>
                        <th className="py-2 text-right font-medium">{t.dashboard.savings}</th>
                        <th className="py-2 text-right font-medium">{t.dashboard.net}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {months.map((m) => (
                        <tr key={m.month}>
                          <td className="py-2 capitalize">
                            <Link href={`/reports?period=month&month=${m.month}`} className="hover:underline">
                              {formatMonth(m.month, intlLocale)}
                            </Link>
                          </td>
                          <td className="py-2 text-right">{formatEUR(m.income)}</td>
                          <td className="py-2 text-right">{formatEUR(m.expenses)}</td>
                          <td className="py-2 text-right">{formatEUR(m.savings)}</td>
                          <td className={cn("py-2 text-right", m.net < 0 && "text-destructive")}>
                            {formatEUR(m.net, { signed: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-medium">
                      <tr className="border-t">
                        <td className="py-2">{t.reports.total}</td>
                        <td className="py-2 text-right">{formatEUR(sums.income)}</td>
                        <td className="py-2 text-right">{formatEUR(sums.expenses)}</td>
                        <td className="py-2 text-right">{formatEUR(sums.savings)}</td>
                        <td className={cn("py-2 text-right", sums.net < 0 && "text-destructive")}>
                          {formatEUR(sums.net, { signed: true })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t.reports.byCategory}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                {CLASS_ORDER.map((cls) => {
                  const items = perCategory.filter((r) => r.class === cls);
                  if (items.length === 0) return null;
                  const classTotal = items.reduce((s, r) => s + r.cents, 0);
                  return (
                    <div key={cls} className="overflow-x-auto">
                      <table className="w-full min-w-[360px] text-sm tabular-nums">
                        <thead className="text-left text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-2 font-medium">{classTitle[cls]}</th>
                            <th className="py-2 text-right font-medium">{t.reports.count}</th>
                            <th className="py-2 text-right font-medium">{t.reports.share}</th>
                            <th className="py-2 text-right font-medium">{t.reports.amount}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {items.map((r) => {
                            const category = r.category_id ? categoryById.get(r.category_id) : undefined;
                            const href = `/transactions${filtersToQuery({ from, to, category: r.category_id ?? NO_CATEGORY, type: cls })}`;
                            return (
                              <tr key={`${cls}-${r.category_id ?? "none"}`}>
                                <td className="py-2">
                                  <Link href={href} className="flex items-center gap-2 hover:underline">
                                    <span
                                      aria-hidden="true"
                                      className="size-2.5 shrink-0 rounded-full"
                                      style={{ background: category?.color ?? "#64748b" }}
                                    />
                                    {category?.name ?? t.dashboard.uncategorized}
                                  </Link>
                                </td>
                                <td className="py-2 text-right text-muted-foreground">{r.count}</td>
                                <td className="py-2 text-right text-muted-foreground">
                                  {classTotal ? Math.round((r.cents / classTotal) * 100) : 0}%
                                </td>
                                <td className="py-2 text-right">{formatEUR(r.cents)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t.reports.export}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <a href={`/reports/export?from=${from}&to=${to}`} download className={buttonVariants()}>
                <Download />
                {t.reports.exportPeriod}
              </a>
              <a href="/reports/export" download className={buttonVariants({ variant: "outline" })}>
                <Download />
                {t.reports.exportAll}
              </a>
            </div>
            <p className="text-sm text-muted-foreground">{t.reports.exportHint}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
