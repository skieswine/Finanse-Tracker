import type { ReactNode } from "react";
import Link from "next/link";
import { Lightbulb, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { InsightList } from "@/components/insight-list";
import { MonthSwitcher } from "@/components/month-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultMonth, getBudgets, getCategories, getInsightRowsBetween, hasAnyTransactions } from "@/lib/data";
import { addMonths, currentMonth, isMonthKey, monthEnd, monthStart, todayISO } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { buildInsights } from "@/lib/insight-sentences";
import { DEFAULT_CATEGORY, localizeCategoryName } from "@/lib/default-categories";

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : await defaultMonth(currentMonth());

  const [{ t, locale, intlLocale }, categories, budgets, anyTransactions] = await Promise.all([
    getI18n(),
    getCategories(),
    getBudgets(month),
    hasAnyTransactions(),
  ]);

  if (!anyTransactions) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t.nav.insights}</h1>
        <EmptyState icon={Lightbulb} title={t.dashboard.emptyTitle} description={t.dashboard.emptyDescription} />
      </>
    );
  }

  // 12 months of history before the selected month (subscriptions need it).
  const end = monthEnd(month);
  const rows = await getInsightRowsBetween(monthStart(addMonths(month, -12)), end);
  const today = todayISO();
  const insights = buildInsights({
    t,
    month,
    asOf: end < today ? end : today,
    rows,
    categories,
    budgets,
  });

  // Shortcuts so a section can be acted on right away.
  const abos = localizeCategoryName(DEFAULT_CATEGORY.subscriptions, locale);
  const abosId = categories.find((c) => c.kind === "expense" && c.name === abos)?.id;
  const actionClass = buttonVariants({ variant: "outline", size: "sm" });
  const budgetsAction = (
    <Link href={`/budgets?month=${month}`} className={actionClass}>
      {budgets.length === 0 ? <Plus /> : <Pencil />}
      {budgets.length === 0 ? t.budgets.add : t.insights.editBudgets}
    </Link>
  );
  const subscriptionAction = (
    <Link href={abosId ? `/transactions/new?category=${abosId}` : "/transactions/new"} className={actionClass}>
      <Plus />
      {t.insights.addSubscription}
    </Link>
  );

  const sections: { title: string; items: typeof insights.changes; empty: string; action?: ReactNode }[] = [
    { title: t.insights.changes, items: insights.changes, empty: insights.empty.changes },
    { title: t.insights.budgets, items: insights.budgets, empty: insights.empty.budgets, action: budgetsAction },
    {
      title: t.insights.subscriptions,
      items: insights.subscriptions,
      empty: insights.empty.subscriptions,
      action: subscriptionAction,
    },
    { title: t.insights.topMerchants, items: insights.merchants, empty: insights.empty.merchants },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.nav.insights}</h1>
        <MonthSwitcher month={month} basePath="/insights" intlLocale={intlLocale} t={t} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              {s.action && <CardAction>{s.action}</CardAction>}
            </CardHeader>
            <CardContent>
              <InsightList items={s.items} empty={s.empty} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
