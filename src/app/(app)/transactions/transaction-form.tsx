"use client";

import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Field, FormError, SubmitButton, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { previewRate } from "@/lib/actions/fx";
import { saveTransaction } from "@/lib/actions/transactions";
import { BASE_CURRENCY, CURRENCIES, formatRate, isCurrency, toEurCents, type Currency } from "@/lib/currency";
import { formatEUR, parseAmountToCents } from "@/lib/money";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { categoryKindFor } from "@/lib/transactions";
import { TX_TYPES, type TxType } from "@/lib/validation";
import type { Account, Category, Debt, Goal } from "@/lib/data";

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
  debt_id: string;
  note: string;
  currency: Currency;
  /** Manual rate ("49,58"); empty = automatic. */
  fx_rate: string;
};

type TransactionFormProps = {
  defaults: TransactionFormDefaults;
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
  debts: Debt[];
};

export function TransactionForm({ defaults, categories, accounts, goals, debts }: TransactionFormProps) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(saveTransaction);
  const [type, setType] = useState<TxType>(defaults.type);
  const [categoryId, setCategoryId] = useState(defaults.category_id);

  const [amount, setAmount] = useState(defaults.amount);
  const [date, setDate] = useState(defaults.date);
  const [accountId, setAccountId] = useState(defaults.account_id);
  const [currency, setCurrency] = useState<Currency>(defaults.currency);
  const [currencyTouched, setCurrencyTouched] = useState(Boolean(defaults.id));
  const [manualRate, setManualRate] = useState(defaults.fx_rate !== "");
  const [rateInput, setRateInput] = useState(defaults.fx_rate);
  // Fetched rate for "currency|date" (key tells whether it is still current).
  const [fetched, setFetched] = useState<{ key: string; rate: number | null }>({ key: "", rate: null });

  const rateKey = `${currency}|${date}`;
  const foreign = currency !== BASE_CURRENCY;
  useEffect(() => {
    if (!foreign || manualRate || !date) return;
    let cancelled = false;
    previewRate(currency, date).then((rate) => {
      if (!cancelled) setFetched({ key: rateKey, rate });
    });
    return () => {
      cancelled = true;
    };
  }, [foreign, manualRate, currency, date, rateKey]);

  const rate = manualRate ? Number(rateInput.replace(",", ".")) || null : fetched.key === rateKey ? fetched.rate : null;
  const rateLoading = foreign && !manualRate && fetched.key !== rateKey;
  const amountCents = parseAmountToCents(amount);

  function changeAccount(id: string) {
    setAccountId(id);
    // New transactions follow the account's currency until the user picks one.
    const accountCurrency = accounts.find((a) => a.id === id)?.currency;
    if (!currencyTouched && isCurrency(accountCurrency)) setCurrency(accountCurrency);
  }

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
        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus={!defaults.id}
            className="h-12 text-2xl font-semibold tabular-nums"
            {...errorProps("amount", fe.amount)}
          />
          <NativeSelect
            name="currency"
            aria-label={t.transactions.currency}
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value as Currency);
              setCurrencyTouched(true);
            }}
            className="w-full [&_select]:h-12 [&_select]:text-base"
          >
            {CURRENCIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </Field>

      {foreign && (
        <div className="-mt-3 grid gap-2 text-sm">
          <p className="text-muted-foreground tabular-nums" aria-live="polite">
            {rateLoading
              ? t.transactions.rateLoading
              : rate
                ? fmt(t.transactions.rateInfo, {
                    eur: amountCents ? formatEUR(toEurCents(amountCents, rate)) : "—",
                    rate: formatRate(rate, currency),
                  })
                : !manualRate && t.validation.rateUnavailable}
          </p>
          {manualRate && (
            <Field id="fx_rate" label={t.transactions.rateLabel} error={fe.fx_rate}>
              <Input
                id="fx_rate"
                name="fx_rate"
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="max-w-40 tabular-nums"
                {...errorProps("fx_rate", fe.fx_rate)}
              />
            </Field>
          )}
          {!manualRate && fe.fx_rate && <p className="text-destructive">{t.validation[fe.fx_rate]}</p>}
          <button
            type="button"
            onClick={() => {
              setManualRate((m) => !m);
              if (!manualRate && !rateInput && rate) setRateInput(String(rate).replace(".", ","));
            }}
            className="justify-self-start text-sm underline underline-offset-4 hover:text-foreground"
          >
            {manualRate ? t.transactions.rateAuto : t.transactions.rateManual}
          </button>
        </div>
      )}

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

      {type === "expense" && debts.length > 0 && (
        <Field id="debt_id" label={t.transactions.debt} optional error={fe.debt_id}>
          <NativeSelect id="debt_id" name="debt_id" defaultValue={defaults.debt_id} className="w-full">
            <NativeSelectOption value="">{t.transactions.noDebt}</NativeSelectOption>
            {debts.map((d) => (
              <NativeSelectOption key={d.id} value={d.id}>
                {d.counterparty ? `${d.name} · ${d.counterparty}` : d.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="date" label={t.transactions.date} error={fe.date}>
          <Input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            {...errorProps("date", fe.date)}
          />
        </Field>

        <Field id="account_id" label={t.transactions.account} optional error={fe.account_id}>
          <NativeSelect
            id="account_id"
            name="account_id"
            value={accountId}
            onChange={(e) => changeAccount(e.target.value)}
            className="w-full"
          >
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
