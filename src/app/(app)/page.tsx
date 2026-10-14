import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Scale, Sparkles } from "lucide-react";
import { SpendingDonut, type DonutSlice } from "@/components/dashboard/spending-donut";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { EmptyState } from "@/components/empty-state";
import { InsightList } from "@/components/insight-list";
import { MonthSwitcher } from "@/components/month-switcher";
import { ProgressBar } from "@/components/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultMonth,
  getBudgets,
  getCategories,
  getDebts,
  getGoals,
  getInsightRowsBetween,
  hasAnyTransactions,
} from "@/lib/data";
import { addMonths, currentMonth, isMonthKey, monthEnd, monthStart, todayISO } from "@/lib/dates";
import { buildInsights } from "@/lib/insight-sentences";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { expensesByCategory, kindMap, monthlyTotals, totals } from "@/lib/summary";
import { NO_CATEGORY, filtersToQuery } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";

const DONUT_SLICES = 6;
const UNCATEGORIZED_COLOR = "#64748b";
const OTHER_COLOR = "#a8a29e";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : await defaultMonth(currentMonth());
  const windowStart = monthStart(addMonths(month, -5));

  const [{ t, intlLocale }, categories, goals, debts, budgets, anyTransactions] = await Promise.all([
    getI18n(),
    getCategories(),
    getGoals(),
    getDebts(),
    getBudgets(month),
    hasAnyTransactions(),
  ]);

  if (!anyTransactions) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t.nav.dashboard}</h1>
        <EmptyState
          icon={Sparkles}
          title={t.dashboard.emptyTitle}
          description={t.dashboard.emptyDescription}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/transactions/new" className={buttonVariants()}>
                <Plus />
                {t.nav.addTransaction}
              </Link>
              <Link href="/import" className={buttonVariants({ variant: "outline" })}>
                {t.nav.import}
              </Link>
            </div>
          }
        />
      </>
    );
  }

  const rows = await getInsightRowsBetween(windowStart, monthEnd(month));
  const today = todayISO();
  const insights = buildInsights({
    t,
    month,
    asOf: monthEnd(month) < today ? monthEnd(month) : today,
    rows,
    categories,
    budgets,
  });
  // Most important first: budget problems, then the biggest change, then subscriptions.
  const preview = [...insights.budgets, ...insights.changes.slice(0, 1), ...insights.subscriptions.slice(0, 1)].slice(0, 3);
  const kinds = kindMap(categories);
  const monthRows = rows.filter((r) => r.date.startsWith(month));
  const sums = totals(monthRows, kinds);
  const trend = monthlyTotals(rows, kinds, month, 6).map(({ month: m, income, expenses }) => ({
    month: m,
    income,
    expenses,
  }));

  // Donut: top categories, the rest folded into "Other".
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const monthRange = { from: monthStart(month), to: monthEnd(month) };
  const spending = expensesByCategory(monthRows, kinds);
  const slices: DonutSlice[] = spending.slice(0, DONUT_SLICES).map((s) => {
    const category = s.category_id ? categoryById.get(s.category_id) : undefined;
    return {
      key: s.category_id ?? NO_CATEGORY,
      name: category?.name ?? t.dashboard.uncategorized,
      cents: s.cents,
      color: category?.color ?? UNCATEGORIZED_COLOR,
      href: `/transactions${filtersToQuery({ ...monthRange, category: s.category_id ?? NO_CATEGORY })}`,
    };
  });
  const rest = spending.slice(DONUT_SLICES).reduce((sum, s) => sum + s.cents, 0);
  if (rest > 0) slices.push({ key: "other", name: t.dashboard.other, cents: rest, color: OTHER_COLOR });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.nav.dashboard}</h1>
        <MonthSwitcher month={month} basePath="/" intlLocale={intlLocale} t={t} />
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t.dashboard.income} cents={sums.income} icon={ArrowDownLeft} whole />
          <StatCard label={t.dashboard.expenses} cents={sums.expenses} icon={ArrowUpRight} whole />
          <StatCard label={t.dashboard.savings} cents={sums.savings} icon={PiggyBank} whole />
          <StatCard label={t.dashboard.net} cents={sums.net} icon={Scale} hint={t.dashboard.netHint} signed whole />
        </div>

        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.insights.preview}</CardTitle>
              <CardAction>
              <Link href={`/insights?month=${month}`} className="text-sm text-muted-foreground hover:text-foreground">
                {t.insights.seeAll}
              </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <InsightList items={preview} />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.byCategory}</CardTitle>
            </CardHeader>
            <CardContent>
              {slices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t.dashboard.noExpenses}</p>
              ) : (
                <SpendingDonut slices={slices} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.trend}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.budgets}</CardTitle>
              <CardAction>
              <Link href={`/budgets?month=${month}`} className="text-sm text-muted-foreground hover:text-foreground">
                {t.dashboard.all}
              </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <div className="grid justify-items-start gap-2 py-2 text-sm text-muted-foreground">
                  <p>{t.dashboard.noBudgets}</p>
                  <Link href={`/budgets?month=${month}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t.dashboard.setBudget}
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-3">
                  {budgets.map((b) => {
                    const category = categoryById.get(b.category_id);
                    const name = category?.name ?? t.common.none;
                    const over = b.spent_cents > b.limit_cents;
                    return (
                      <li key={b.id} className="grid gap-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate">{name}</span>
                          <span className={cn("tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
                            {fmt(t.budgets.progress, {
                              spent: formatEUR(b.spent_cents, { whole: true }),
                              limit: formatEUR(b.limit_cents, { whole: true }),
                            })}
                          </span>
                        </div>
                        <ProgressBar value={b.spent_cents / b.limit_cents} label={name} color={category?.color} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.goals}</CardTitle>
              <CardAction>
              <Link href="/goals" className="text-sm text-muted-foreground hover:text-foreground">
                {t.dashboard.all}
              </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="grid justify-items-start gap-2 py-2 text-sm text-muted-foreground">
                  <p>{t.dashboard.noGoals}</p>
                  <Link href="/goals" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t.dashboard.addGoal}
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-3">
                  {goals.map((g) => (
                    <li key={g.id} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{g.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {g.saved_cents >= g.target_cents
                            ? t.goals.reached
                            : fmt(t.goals.progress, {
                                saved: formatEUR(g.saved_cents, { whole: true }),
                                target: formatEUR(g.target_cents, { whole: true }),
                              })}
                        </span>
                      </div>
                      <ProgressBar value={Math.min(g.saved_cents / g.target_cents, 1)} label={g.name} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {debts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.debts}</CardTitle>
                <CardAction>
                  <Link href="/debts" className="text-sm text-muted-foreground hover:text-foreground">
                    {t.dashboard.all}
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3">
                  {debts.map((d) => (
                    <li key={d.id} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{d.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {d.paid_cents >= d.amount_cents
                            ? t.debts.paidOff
                            : fmt(t.debts.progress, {
                                paid: formatEUR(d.paid_cents, { whole: true }),
                                total: formatEUR(d.amount_cents, { whole: true }),
                              })}
                        </span>
                      </div>
                      <ProgressBar value={Math.min(d.paid_cents / d.amount_cents, 1)} label={d.name} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
