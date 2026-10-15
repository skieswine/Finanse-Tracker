import { PageHeader } from "@/components/page-header";
import { getAccounts, getCategories, getDebts, getGoals } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { DEFAULT_CATEGORY, localizeCategoryName } from "@/lib/default-categories";
import { TX_TYPES, type TxType } from "@/lib/validation";
import { BASE_CURRENCY, isCurrency } from "@/lib/currency";
import { TransactionForm } from "../transaction-form";

function isTxType(value: unknown): value is TxType {
  return typeof value === "string" && (TX_TYPES as readonly string[]).includes(value);
}

export default async function NewTransactionPage({
  searchParams,
}: PageProps<"/transactions/new">) {
  const [{ t, locale }, categories, accounts, goals, debts, params] = await Promise.all([
    getI18n(),
    getCategories(),
    getAccounts(),
    getGoals(),
    getDebts(),
    searchParams,
  ]);

  // ?type=savings&goal=<id> preselects a deposit (used by "Deposit" on goals).
  const type = isTxType(params.type) ? params.type : "expense";
  // With a single account, preselect it (and its currency).
  const account = accounts.length === 1 ? accounts[0] : undefined;
  // ?debt=<id> preselects a repayment (used by "Make a payment" on debts),
  // with the default debt category when it exists.
  const debtId = typeof params.debt === "string" && debts.some((d) => d.id === params.debt) ? params.debt : "";
  const debtName = localizeCategoryName(DEFAULT_CATEGORY.debts, locale);
  const debtCategory = debtId ? categories.find((c) => c.kind === "expense" && c.name === debtName) : undefined;
  // ?category=<id> preselects a category (used by "Add subscription" in insights).
  const categoryId =
    typeof params.category === "string" && categories.some((c) => c.id === params.category) ? params.category : "";
  const goalId =
    typeof params.goal === "string" && goals.some((g) => g.id === params.goal) ? params.goal : "";

  return (
    <>
      <PageHeader title={t.transactions.newTitle} />
      <TransactionForm
        categories={categories}
        accounts={accounts}
        goals={goals}
        debts={debts}
        defaults={{
          type,
          amount: "",
          direction: "out",
          date: todayISO(),
          description: "",
          merchant: "",
          category_id: debtCategory?.id ?? categoryId,
          account_id: account?.id ?? "",
          savings_goal_id: goalId,
          debt_id: debtId,
          note: "",
          currency: isCurrency(account?.currency) ? account.currency : BASE_CURRENCY,
          fx_rate: "",
        }}
      />
    </>
  );
}
