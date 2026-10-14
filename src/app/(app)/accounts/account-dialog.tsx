"use client";

import type { ReactElement } from "react";
import { Field, errorProps } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { RowActions } from "@/components/row-actions";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteAccount, saveAccount } from "@/lib/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { ACCOUNT_TYPES } from "@/lib/validation";
import { CURRENCIES } from "@/lib/currency";
import type { Account } from "@/lib/data";

export function AccountDialog({ trigger, account }: { trigger: ReactElement; account?: Account }) {
  const { t } = useI18n();
  return (
    <FormDialog title={account ? t.accounts.edit : t.accounts.add} trigger={trigger} action={saveAccount}>
      {(fe) => (
        <>
          {account && <input type="hidden" name="id" value={account.id} />}
          <Field id="name" label={t.accounts.name} error={fe.name}>
            <Input id="name" name="name" defaultValue={account?.name} autoFocus {...errorProps("name", fe.name)} />
          </Field>
          <Field id="type" label={t.accounts.type} error={fe.type}>
            <NativeSelect id="type" name="type" defaultValue={account?.type ?? "checking"} className="w-full">
              {ACCOUNT_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {t.accounts.types[type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field id="currency" label={t.accounts.currency} error={fe.currency}>
            <NativeSelect id="currency" name="currency" defaultValue={account?.currency ?? "EUR"} className="w-full">
              {CURRENCIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function AccountRowActions({ account }: { account: Account }) {
  const { t } = useI18n();
  return (
    <RowActions
      editDialog={(trigger) => <AccountDialog trigger={trigger} account={account} />}
      deleteTitle={fmt(t.accounts.deleteTitle, { name: account.name })}
      deleteDescription={t.accounts.deleteDescription}
      onDelete={() => deleteAccount(account.id)}
    />
  );
}
