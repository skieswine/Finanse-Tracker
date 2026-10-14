import { PageHeader } from "@/components/page-header";
import { getAccounts, getCategories, getImportBatches, getRules } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { ImportFlow } from "./import-flow";

export default async function ImportPage() {
  const [{ t }, categories, accounts, rules, batches] = await Promise.all([
    getI18n(),
    getCategories(),
    getAccounts(),
    getRules(),
    getImportBatches(),
  ]);

  return (
    <>
      <PageHeader title={t.nav.import} />
      <ImportFlow categories={categories} accounts={accounts} rules={rules} batches={batches} />
    </>
  );
}
