import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDebts } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { DebtDialog, DebtRowActions } from "./debt-dialog";

export default async function DebtsPage() {
  const [{ t, intlLocale }, debts] = await Promise.all([getI18n(), getDebts()]);

  const addButton = (
    <Button size="lg" className="h-10">
      <Plus />
      <span className="hidden sm:inline">{t.debts.add}</span>
    </Button>
  );

  return (
    <>
      <PageHeader title={t.debts.title} actions={<DebtDialog trigger={addButton} />} />
      {debts.length === 0 ? (
        <EmptyState icon={HandCoins} title={t.debts.emptyTitle} description={t.debts.emptyDescription} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {debts.map((d) => {
            const ratio = d.paid_cents / d.amount_cents;
            const left = Math.max(0, d.amount_cents - d.paid_cents);
            const details = [
              d.counterparty,
              d.monthly_cents ? fmt(t.debts.monthlyInfo, { amount: formatEUR(d.monthly_cents) }) : null,
              d.due_date ? fmt(t.debts.until, { date: formatDate(d.due_date, intlLocale) }) : null,
            ].filter(Boolean);
            return (
              <Card key={d.id} className="gap-3 px-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium">{d.name}</h2>
                    {details.length > 0 && (
                      <p className="truncate text-sm text-muted-foreground">{details.join(" · ")}</p>
                    )}
                  </div>
                  <DebtRowActions debt={d} />
                </div>
                <ProgressBar value={Math.min(ratio, 1)} label={d.name} />
                <div className="flex items-end justify-between gap-2 text-sm">
                  <div className="grid tabular-nums">
                    <span>
                      {fmt(t.debts.progress, { paid: formatEUR(d.paid_cents), total: formatEUR(d.amount_cents) })}
                    </span>
                    <span className="text-muted-foreground">
                      {ratio >= 1 ? t.debts.paidOff : fmt(t.debts.remaining, { amount: formatEUR(left) })}
                      {d.last_payment &&
                        ` · ${fmt(t.debts.lastPayment, { date: formatDate(d.last_payment, intlLocale) })}`}
                    </span>
                  </div>
                  {ratio < 1 && (
                    <Link
                      href={`/transactions/new?type=expense&debt=${d.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Plus />
                      {t.debts.pay}
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">{t.debts.hint}</p>
    </>
  );
}
