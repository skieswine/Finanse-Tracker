"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, ListChecks, Plus, SearchX, Trash2, X } from "lucide-react";
import { MerchantAvatar } from "@/components/merchant-avatar";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteTransactions } from "@/lib/actions/transactions";
import { formatDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALE, fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { filtersToQuery, type TxFilters } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import type { Totals } from "@/lib/summary";
import type { Account, Category, Transaction } from "@/lib/data";
import { FilterBar } from "./filter-bar";
import { InlineCategory } from "./inline-category";

type TransactionListProps = {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  filters: TxFilters;
  total: number;
  pageCount: number;
  sums: Totals;
};

export function TransactionList({
  transactions,
  categories,
  accounts,
  filters,
  total,
  pageCount,
  sums,
}: TransactionListProps) {
  const { t, locale } = useI18n();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Group by date, keeping the newest-first order from the query.
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return [...map];
  }, [transactions]);

  // Ignore selections of rows no longer on this page (after delete / paging).
  const selectedIds = transactions.filter((tx) => selected.has(tx.id)).map((tx) => tx.id);
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  const pageHref = (page: number) => `/transactions${filtersToQuery({ ...filters, page })}`;

  return (
    <>
      <PageHeader
        title={t.nav.transactions}
        actions={
          <div className="flex gap-2">
            {selecting ? (
              <Button variant="outline" size="lg" className="h-10" onClick={stopSelecting}>
                <X />
                <span className="hidden sm:inline">{t.common.cancel}</span>
              </Button>
            ) : (
              transactions.length > 0 && (
                <Button variant="outline" size="lg" className="h-10" onClick={() => setSelecting(true)}>
                  <ListChecks />
                  <span className="hidden sm:inline">{t.transactions.select}</span>
                </Button>
              )
            )}
            <Link href="/transactions/new" className={buttonVariants({ size: "lg", className: "h-10" })}>
              <Plus />
              <span className="hidden sm:inline">{t.common.add}</span>
            </Link>
          </div>
        }
      />

      <FilterBar filters={filters} categories={categories} accounts={accounts} />

      {total === 0 ? (
        <EmptyState icon={SearchX} title={t.filters.noResults} description={t.filters.noResultsHint} />
      ) : (
        <div className={cn("grid gap-5", selecting && "pb-20")}>
          <p className="flex flex-wrap gap-x-3 px-1 text-sm text-muted-foreground tabular-nums">
            <span>{fmt(t.filters.results, { count: total })}</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {t.dashboard.income}: {formatEUR(sums.income)}
            </span>
            <span>
              {t.dashboard.expenses}: {formatEUR(sums.expenses)}
            </span>
            {sums.savings !== 0 && (
              <span>
                {t.dashboard.savings}: {formatEUR(sums.savings)}
              </span>
            )}
          </p>

          {groups.map(([date, txs]) => (
            <section key={date}>
              <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground">
                {formatDate(date, INTL_LOCALE[locale], {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <Card className="gap-0 py-0">
                <ul className="divide-y">
                  {txs.map((tx) => {
                    const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
                    const account = tx.account_id ? accountById.get(tx.account_id) : undefined;
                    const title = tx.merchant || tx.description || category?.name || t.transactions.noCategory;
                    const isSelected = selected.has(tx.id);
                    const amount = (
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular-nums",
                          tx.is_transfer
                            ? "text-muted-foreground"
                            : tx.amount_cents > 0 && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {formatEUR(tx.amount_cents, { signed: true })}
                      </span>
                    );
                    const icon = (
                      <MerchantAvatar merchant={tx.merchant} category={category} isTransfer={tx.is_transfer} />
                    );
                    const meta = (
                      <>
                        {account && <span className="truncate">{account.name}</span>}
                        {tx.source === "import" && <Badge variant="secondary">{t.transactions.imported}</Badge>}
                      </>
                    );

                    if (selecting) {
                      return (
                        <li key={tx.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`${t.transactions.selectRow}: ${title}`}
                            onClick={() => toggle(tx.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                              isSelected && "bg-muted/60",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded border",
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                              )}
                            >
                              {isSelected && <Check className="size-3.5" />}
                            </span>
                            {icon}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{title}</p>
                              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                                {category?.name ?? (tx.is_transfer ? t.txTypes.transfer : t.transactions.noCategory)}
                                {meta}
                              </p>
                            </div>
                            {amount}
                          </button>
                        </li>
                      );
                    }

                    const href = `/transactions/${tx.id}/edit`;
                    return (
                      <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <Link href={href} tabIndex={-1} aria-hidden="true">
                          {icon}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={href} className="block truncate font-medium hover:underline">
                            {title}
                          </Link>
                          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <InlineCategory
                              id={tx.id}
                              categoryId={tx.category_id}
                              isTransfer={tx.is_transfer}
                              categories={categories}
                            />
                            {meta}
                          </div>
                        </div>
                        <Link href={href} tabIndex={-1}>
                          {amount}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}

          {pageCount > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label={fmt(t.filters.page, { page: filters.page, pages: pageCount })}>
              <PageLink href={pageHref(filters.page - 1)} disabled={filters.page <= 1}>
                <ChevronLeft />
                {t.filters.prev}
              </PageLink>
              <span className="text-sm text-muted-foreground">
                {fmt(t.filters.page, { page: filters.page, pages: pageCount })}
              </span>
              <PageLink href={pageHref(filters.page + 1)} disabled={filters.page >= pageCount}>
                {t.filters.next}
                <ChevronRight />
              </PageLink>
            </nav>
          )}
        </div>
      )}

      {selecting && (
        // Above the mobile bottom nav (and over the "+" button).
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 px-4 md:bottom-4 md:left-60 md:px-8">
          <Card className="mx-auto max-w-5xl flex-row flex-wrap items-center gap-2 px-4 py-3 shadow-lg">
            <span className="flex-1 text-sm font-medium">
              {fmt(t.transactions.selectedCount, { count: selectedIds.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(allSelected ? new Set() : new Set(transactions.map((tx) => tx.id)))}
            >
              {allSelected ? t.transactions.deselectAll : t.transactions.selectAll}
            </Button>
            <ConfirmDelete
              title={fmt(t.transactions.bulkDeleteTitle, { count: selectedIds.length })}
              description={t.transactions.deleteDescription}
              onConfirm={async () => {
                const result = await deleteTransactions(selectedIds);
                if (result.ok) stopSelecting();
                return result;
              }}
              trigger={
                <Button variant="destructive" size="sm" disabled={selectedIds.length === 0}>
                  <Trash2 />
                  {fmt(t.transactions.deleteSelected, { count: selectedIds.length })}
                </Button>
              }
            />
          </Card>
        </div>
      )}
    </>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={buttonVariants({ variant: "outline", className: "pointer-events-none opacity-50" })}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={buttonVariants({ variant: "outline" })}>
      {children}
    </Link>
  );
}
