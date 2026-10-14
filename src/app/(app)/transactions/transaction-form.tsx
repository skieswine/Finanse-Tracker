"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Field, FormError, SubmitButton, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveTransaction } from "@/lib/actions/transactions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryKindFor } from "@/lib/transactions";
import { TX_TYPES, type TxType } from "@/lib/validation";
import type { Account, Category, Goal } from "@/lib/data";

export type TransactionFormDefaults = {
  id?: string;
  type: TxType;
  amount: string;
  direction: "out" | "in";
  date: string;
  description: string;
  merchant: string;
  category_id: string;
  account_id: string;
  savings_goal_id: string;
  note: string;
};

type TransactionFormProps = {
  defaults: TransactionFormDefaults;
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
};

export function TransactionForm({ defaults, categories, accounts, goals }: TransactionFormProps) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(saveTransaction);
  const [type, setType] = useState<TxType>(defaults.type);
  const [categoryId, setCategoryId] = useState(defaults.category_id);

  const kind = categoryKindFor(type);
  const visibleCategories = kind ? categories.filter((c) => c.kind === kind) : [];
  const fe = state.fieldErrors ?? {};

  function changeType(next: TxType) {
    setType(next);
    // Drop a category that doesn't belong to the new type.
    const nextKind = categoryKindFor(next);
    if (!categories.some((c) => c.id === categoryId && c.kind === nextKind)) setCategoryId("");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      {/* Type: segmented control */}
      <fieldset>
        <legend className="sr-only">{t.transactions.type}</legend>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {TX_TYPES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center rounded-md px-1 text-center text-xs font-medium transition-colors sm:text-sm",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                type === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => changeType(value)}
                className="sr-only"
              />
              {t.txTypes[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="amount" label={t.transactions.amount} error={fe.amount}>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          defaultValue={defaults.amount}
          autoFocus={!defaults.id}
          className="h-12 text-2xl font-semibold tabular-nums"
          {...errorProps("amount", fe.amount)}
        />
      </Field>

      {type === "transfer" && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t.transactions.direction}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["out", "in"] as const).map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-muted"
              >
                <input type="radio" name="direction" value={d} defaultChecked={defaults.direction === d} />
                {d === "out" ? t.transactions.directionOut : t.transactions.directionIn}
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t.transactions.transferHint}</p>
        </fieldset>
      )}

      {kind && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.transactions.category}</legend>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c) => (
              <CategoryChip
                key={c.id}
                checked={categoryId === c.id}
                onSelect={() => setCategoryId(c.id)}
                value={c.id}
                label={c.name}
              >
                <CategoryIcon icon={c.icon} color={c.color} className="size-6 [&_svg]:size-3.5" />
              </CategoryChip>
            ))}
            <CategoryChip
              checked={categoryId === ""}
              onSelect={() => setCategoryId("")}
              value=""
              label={t.transactions.noCategory}
            />
          </div>
          {fe.category_id && (
            <p className="mt-2 text-sm text-destructive">{t.validation[fe.category_id]}</p>
          )}
        </fieldset>
      )}

      {type === "savings" && goals.length > 0 && (
        <Field id="savings_goal_id" label={t.transactions.goal} optional error={fe.savings_goal_id}>
          <NativeSelect id="savings_goal_id" name="savings_goal_id" defaultValue={defaults.savings_goal_id} className="w-full">
            <NativeSelectOption value="">{t.transactions.noGoal}</NativeSelectOption>
            {goals.map((g) => (
              <NativeSelectOption key={g.id} value={g.id}>
                {g.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="date" label={t.transactions.date} error={fe.date}>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required {...errorProps("date", fe.date)} />
        </Field>

        <Field id="account_id" label={t.transactions.account} optional error={fe.account_id}>
          <NativeSelect id="account_id" name="account_id" defaultValue={defaults.account_id} className="w-full">
            <NativeSelectOption value="">{t.transactions.noAccount}</NativeSelectOption>
            {accounts.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field id="description" label={t.transactions.description} optional error={fe.description}>
        <Input
          id="description"
          name="description"
          defaultValue={defaults.description}
          placeholder={t.transactions.descriptionPlaceholder}
          {...errorProps("description", fe.description)}
        />
      </Field>

      <Field id="merchant" label={t.transactions.merchant} optional error={fe.merchant}>
        <Input
          id="merchant"
          name="merchant"
          defaultValue={defaults.merchant}
          placeholder={t.transactions.merchantPlaceholder}
          {...errorProps("merchant", fe.merchant)}
        />
      </Field>

      <Field id="note" label={t.transactions.note} optional error={fe.note}>
        <Textarea id="note" name="note" rows={2} defaultValue={defaults.note} {...errorProps("note", fe.note)} />
      </Field>

      <FormError error={state.error} />
      <SubmitButton pending={pending} className="h-11 w-full sm:w-auto sm:justify-self-start sm:px-8" />
    </form>
  );
}

type CategoryChipProps = {
  value: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
};

function CategoryChip({ value, label, checked, onSelect, children }: CategoryChipProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        !children && "pl-3",
        checked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <input
        type="radio"
        name="category_id"
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
      {label}
    </label>
  );
}
