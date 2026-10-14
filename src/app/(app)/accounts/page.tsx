import { Landmark, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccounts } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { AccountDialog, AccountRowActions } from "./account-dialog";

export default async function AccountsPage() {
  const [{ t }, accounts] = await Promise.all([getI18n(), getAccounts()]);

  const addButton = (
    <Button size="lg" className="h-10">
      <Plus />
      <span className="hidden sm:inline">{t.accounts.add}</span>
    </Button>
  );

  return (
    <>
      <PageHeader title={t.accounts.title} actions={<AccountDialog trigger={addButton} />} />
      {accounts.length === 0 ? (
        <EmptyState icon={Landmark} title={t.accounts.emptyTitle} description={t.accounts.emptyDescription} />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Landmark className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{a.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.accounts.types[a.type]} · {a.currency}
                  </p>
                </div>
                <AccountRowActions account={a} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
