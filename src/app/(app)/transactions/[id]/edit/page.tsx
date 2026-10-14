import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getAccounts, getCategories, getDebts, getGoals, getTransaction } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { filtersToQuery } from "@/lib/transaction-filters";
import { centsToInput } from "@/lib/money";
import { deriveTxType } from "@/lib/transactions";
import { BASE_CURRENCY, isCurrency } from "@/lib/currency";
import { idSchema } from "@/lib/validation";
import { TransactionForm } from "../../transaction-form";
import { DeleteTransactionButton } from "./delete-button";

export default async function EditTransactionPage({
  params,
}: PageProps<"/transactions/[id]/edit">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const [{ t }, tx, categories, accounts, goals, debts] = await Promise.all([
    getI18n(),
    getTransaction(id),
    getCategories(),
    getAccounts(),
    getGoals(),
    getDebts(),
  ]);
  if (!tx) notFound();

  const category = categories.find((c) => c.id === tx.category_id);

  return (
    <>
      <PageHeader
        title={t.transactions.editTitle}
        actions={<DeleteTransactionButton id={tx.id} />}
      />
      {(tx.merchant || category) && (
        <div className="-mt-3 mb-5 flex flex-wrap gap-2">
          {tx.merchant && (
            <Link
              href={`/transactions${filtersToQuery({ q: tx.merchant })}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Search />
              {fmt(t.filters.similarMerchant, { name: tx.merchant })}
            </Link>
          )}
          {category && (
            <Link
              href={`/transactions${filtersToQuery({ category: category.id })}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Tag />
              {fmt(t.filters.similarCategory, { name: category.name })}
            </Link>
          )}
        </div>
      )}
      <TransactionForm
        categories={categories}
        accounts={accounts}
        goals={goals}
        debts={debts}
        defaults={{
          id: tx.id,
          type: deriveTxType(tx, category?.kind),
          // Foreign-currency transactions are edited in their own currency.
          amount: centsToInput(Math.abs(tx.original_cents ?? tx.amount_cents)),
          direction: tx.amount_cents > 0 ? "in" : "out",
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant ?? "",
          category_id: tx.category_id ?? "",
          account_id: tx.account_id ?? "",
          savings_goal_id: tx.savings_goal_id ?? "",
          debt_id: tx.debt_id ?? "",
          note: tx.note ?? "",
          currency: isCurrency(tx.currency) ? tx.currency : BASE_CURRENCY,
          // Keep the stored rate on edit, so re-saving never shifts the EUR amount.
          fx_rate: tx.fx_rate ? String(tx.fx_rate).replace(".", ",") : "",
        }}
      />
    </>
  );
}
