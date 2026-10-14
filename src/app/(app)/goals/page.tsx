import Link from "next/link";
import { PiggyBank, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGoals } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { GoalDialog, GoalRowActions } from "./goal-dialog";

export default async function GoalsPage() {
  const [{ t, intlLocale }, goals] = await Promise.all([getI18n(), getGoals()]);

  const addButton = (
    <Button size="lg" className="h-10">
      <Plus />
      <span className="hidden sm:inline">{t.goals.add}</span>
    </Button>
  );

  return (
    <>
      <PageHeader title={t.goals.title} actions={<GoalDialog trigger={addButton} />} />
      {goals.length === 0 ? (
        <EmptyState icon={PiggyBank} title={t.goals.emptyTitle} description={t.goals.emptyDescription} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((g) => {
            const ratio = g.saved_cents / g.target_cents;
            return (
              <Card key={g.id} className="gap-3 px-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium">{g.name}</h2>
                    {g.deadline && (
                      <p className="text-sm text-muted-foreground">
                        {fmt(t.goals.until, { date: formatDate(g.deadline, intlLocale) })}
                      </p>
                    )}
                  </div>
                  <GoalRowActions goal={g} />
                </div>
                <ProgressBar value={Math.min(ratio, 1)} label={g.name} />
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {ratio >= 1
                      ? t.goals.reached
                      : fmt(t.goals.progress, {
                          saved: formatEUR(g.saved_cents),
                          target: formatEUR(g.target_cents),
                        })}
                  </span>
                  <Link
                    href={`/transactions/new?type=savings&goal=${g.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Plus />
                    {t.goals.deposit}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">{t.goals.depositHint}</p>
    </>
  );
}
