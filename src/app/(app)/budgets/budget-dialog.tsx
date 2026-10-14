"use client";

import type { ReactElement } from "react";
import { Field, errorProps } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { RowActions } from "@/components/row-actions";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteBudget, saveBudget } from "@/lib/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { centsToInput } from "@/lib/money";
import type { Budget, Category } from "@/lib/data";

type BudgetDialogProps = {
  trigger: ReactElement;
  month: string;
  /** Expense categories that can get a budget (create mode). */
  categories: Pick<Category, "id" | "name">[];
  budget?: Budget;
};

export function BudgetDialog({ trigger, month, categories, budget }: BudgetDialogProps) {
  const { t } = useI18n();
  return (
    <FormDialog title={budget ? t.budgets.edit : t.budgets.add} trigger={trigger} action={saveBudget}>
      {(fe) => (
        <>
          <input type="hidden" name="month" value={month} />
          {budget ? (
            <input type="hidden" name="category_id" value={budget.category_id} />
          ) : (
            <Field id="category_id" label={t.budgets.category} error={fe.category_id}>
              <NativeSelect id="category_id" name="category_id" className="w-full">
                {categories.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field id="limit" label={t.budgets.limit} error={fe.limit}>
            <Input
              id="limit"
              name="limit"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus={Boolean(budget)}
              defaultValue={budget ? centsToInput(budget.limit_cents) : ""}
              {...errorProps("limit", fe.limit)}
            />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function BudgetRowActions({
  budget,
  month,
  categoryName,
}: {
  budget: Budget;
  month: string;
  categoryName: string;
}) {
  const { t } = useI18n();
  return (
    <RowActions
      editDialog={(trigger) => (
        <BudgetDialog trigger={trigger} month={month} categories={[]} budget={budget} />
      )}
      deleteTitle={fmt(t.budgets.deleteTitle, { name: categoryName })}
      deleteDescription={t.budgets.deleteDescription}
      onDelete={() => deleteBudget(budget.id)}
    />
  );
}
