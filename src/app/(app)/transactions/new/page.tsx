import { PageHeader } from "@/components/page-header";
import { getAccounts, getCategories, getGoals } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { TX_TYPES, type TxType } from "@/lib/validation";
import { TransactionForm } from "../transaction-form";

function isTxType(value: unknown): value is TxType {
  return typeof value === "string" && (TX_TYPES as readonly string[]).includes(value);
}

export default async function NewTransactionPage({
  searchParams,
}: PageProps<"/transactions/new">) {
  const [{ t }, categories, accounts, goals, params] = await Promise.all([
    getI18n(),
    getCategories(),
    getAccounts(),
    getGoals(),
    searchParams,
  ]);

  // ?type=savings&goal=<id> preselects a deposit (used by "Deposit" on goals).
  const type = isTxType(params.type) ? params.type : "expense";
  const goalId =
    typeof params.goal === "string" && goals.some((g) => g.id === params.goal) ? params.goal : "";

  return (
    <>
      <PageHeader title={t.transactions.newTitle} />
      <TransactionForm
        categories={categories}
        accounts={accounts}
        goals={goals}
        defaults={{
          type,
          amount: "",
          direction: "out",
          date: todayISO(),
          description: "",
          merchant: "",
          category_id: "",
          // With a single account, preselect it.
          account_id: accounts.length === 1 ? accounts[0].id : "",
          savings_goal_id: goalId,
          note: "",
        }}
      />
    </>
  );
}
