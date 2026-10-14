"use client";

import type { ReactElement } from "react";
import { Field, errorProps } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { RowActions } from "@/components/row-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteDebt, saveDebt } from "@/lib/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { centsToInput } from "@/lib/money";
import type { Debt } from "@/lib/data";

export function DebtDialog({ trigger, debt }: { trigger: ReactElement; debt?: Debt }) {
  const { t } = useI18n();
  return (
    <FormDialog title={debt ? t.debts.edit : t.debts.add} trigger={trigger} action={saveDebt}>
      {(fe) => (
        <>
          {debt && <input type="hidden" name="id" value={debt.id} />}
          <Field id="name" label={t.debts.name} error={fe.name}>
            <Input
              id="name"
              name="name"
              defaultValue={debt?.name}
              placeholder={t.debts.namePlaceholder}
              autoFocus
              {...errorProps("name", fe.name)}
            />
          </Field>
          <Field id="counterparty" label={t.debts.counterparty} optional error={fe.counterparty}>
            <Input
              id="counterparty"
              name="counterparty"
              defaultValue={debt?.counterparty ?? ""}
              placeholder={t.debts.counterpartyPlaceholder}
              {...errorProps("counterparty", fe.counterparty)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="amount" label={t.debts.amount} error={fe.amount}>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={debt ? centsToInput(debt.amount_cents) : ""}
                {...errorProps("amount", fe.amount)}
              />
            </Field>
            <Field id="monthly_payment" label={t.debts.monthly} optional error={fe.monthly_payment}>
              <Input
                id="monthly_payment"
                name="monthly_payment"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={debt?.monthly_cents ? centsToInput(debt.monthly_cents) : ""}
                {...errorProps("monthly_payment", fe.monthly_payment)}
              />
            </Field>
          </div>
          <Field id="due_date" label={t.debts.dueDate} optional error={fe.due_date}>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={debt?.due_date ?? ""}
              {...errorProps("due_date", fe.due_date)}
            />
          </Field>
          <Field id="note" label={t.debts.note} optional error={fe.note}>
            <Textarea id="note" name="note" rows={2} defaultValue={debt?.note ?? ""} {...errorProps("note", fe.note)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function DebtRowActions({ debt }: { debt: Debt }) {
  const { t } = useI18n();
  return (
    <RowActions
      editDialog={(trigger) => <DebtDialog trigger={trigger} debt={debt} />}
      deleteTitle={fmt(t.debts.deleteTitle, { name: debt.name })}
      deleteDescription={t.debts.deleteDescription}
      onDelete={() => deleteDebt(debt.id)}
    />
  );
}
