"use client";

import { useState, useTransition } from "react";
import { updateTransactionCategory } from "@/lib/actions/transactions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { CATEGORY_KINDS } from "@/lib/validation";
import type { Category } from "@/lib/data";

const TRANSFER = "transfer";

type InlineCategoryProps = {
  id: string;
  categoryId: string | null;
  isTransfer: boolean;
  categories: Category[];
};

/** Compact category picker inside a list row; saves on change (optimistic). */
export function InlineCategory({ id, categoryId, isTransfer, categories }: InlineCategoryProps) {
  const { t } = useI18n();
  const saved = isTransfer ? TRANSFER : (categoryId ?? "");
  const [value, setValue] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  // Follow server updates (e.g. after editing the transaction elsewhere).
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }

  return (
    <select
      aria-label={t.transactions.category}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        setFailed(false);
        startTransition(async () => {
          const result = await updateTransactionCategory(id, next);
          if (result.error) {
            setValue(saved);
            setFailed(true);
          }
        });
      }}
      className={cn(
        "max-w-40 cursor-pointer truncate rounded-md bg-transparent py-0.5 pr-1 text-sm text-muted-foreground outline-none",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        failed && "text-destructive",
      )}
    >
      <option value="" className="bg-[Canvas] text-[CanvasText]">
        {t.transactions.noCategory}
      </option>
      {CATEGORY_KINDS.map((kind) => (
        <optgroup key={kind} label={t.categories.kinds[kind]} className="bg-[Canvas] text-[CanvasText]">
          {categories
            .filter((c) => c.kind === kind)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
      <option value={TRANSFER} className="bg-[Canvas] text-[CanvasText]">
        {t.txTypes.transfer}
      </option>
    </select>
  );
}
