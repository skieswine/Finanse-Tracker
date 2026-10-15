import { Plus, Target } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBudgets, getCategories } from "@/lib/data";
import { currentMonth, isMonthKey } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { BudgetDialog, BudgetRowActions } from "./budget-dialog";

export default async function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : currentMonth();

  const [{ t, intlLocale }, budgets, categories] = await Promise.all([
    getI18n(),
    getBudgets(month),
    getCategories(),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const budgeted = new Set(budgets.map((b) => b.category_id));
  const available = categories
    .filter((c) => c.kind === "expense" && !budgeted.has(c.id))
    .map(({ id, name }) => ({ id, name }));

  const sorted = [...budgets].sort((a, b) =>
    (categoryById.get(a.category_id)?.name ?? "").localeCompare(categoryById.get(b.category_id)?.name ?? ""),
  );

  const addBudget = (
    <BudgetDialog
      month={month}
      categories={available}
      trigger={
        <Button size="lg" className="h-10">
          <Plus />
          {t.budgets.add}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title={t.budgets.title}
        // With no budgets yet the button sits in the empty state instead.
        actions={sorted.length > 0 && available.length > 0 && addBudget}
      />

      <div className="mb-4 flex justify-center sm:justify-start">
        <MonthSwitcher month={month} basePath="/budgets" intlLocale={intlLocale} t={t} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t.budgets.emptyTitle}
          description={t.budgets.emptyDescription}
          action={available.length > 0 && addBudget}
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {sorted.map((b) => {
              const category = categoryById.get(b.category_id);
              const name = category?.name ?? t.common.none;
              const left = b.limit_cents - b.spent_cents;
              return (
                <li key={b.id} className="grid gap-2 py-3 pr-2 pl-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={category?.icon} color={category?.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {fmt(t.budgets.progress, {
                          spent: formatEUR(b.spent_cents),
                          limit: formatEUR(b.limit_cents),
                        })}
                      </p>
                    </div>
                    <BudgetRowActions budget={b} month={month} categoryName={name} />
                  </div>
                  <div className="grid gap-1 pr-2">
                    <ProgressBar value={b.spent_cents / b.limit_cents} label={name} color={category?.color} />
                    <p className={cn("text-xs tabular-nums", left < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {left < 0
                        ? fmt(t.budgets.over, { amount: formatEUR(-left) })
                        : fmt(t.budgets.remaining, { amount: formatEUR(left) })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {available.length === 0 && sorted.length > 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{t.budgets.allSet}</p>
      )}
    </>
  );
}
