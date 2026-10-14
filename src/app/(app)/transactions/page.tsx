import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  getAccounts,
  getCategories,
  getSummaryRows,
  getTransactionsPage,
  hasAnyTransactions,
} from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { kindMap, totals } from "@/lib/summary";
import { parseFilters } from "@/lib/transaction-filters";
import { TransactionList } from "./transaction-list";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const filters = parseFilters(await searchParams);
  const [{ t }, categories, accounts, anyTransactions] = await Promise.all([
    getI18n(),
    getCategories(),
    getAccounts(),
    hasAnyTransactions(),
  ]);

  if (!anyTransactions) {
    return (
      <>
        <PageHeader title={t.nav.transactions} />
        <EmptyState
          icon={ArrowLeftRight}
          title={t.transactions.emptyTitle}
          description={t.transactions.emptyDescription}
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

  const [pageData, summaryRows] = await Promise.all([
    getTransactionsPage(filters, categories),
    getSummaryRows(filters, categories),
  ]);

  return (
    <TransactionList
      // Remount on page/filter change so a stale selection never carries over.
      key={JSON.stringify({ ...filters, q: "" })}
      transactions={pageData.rows}
      categories={categories}
      accounts={accounts}
      filters={filters}
      total={pageData.total}
      pageCount={pageData.pageCount}
      sums={totals(summaryRows, kindMap(categories))}
    />
  );
}
