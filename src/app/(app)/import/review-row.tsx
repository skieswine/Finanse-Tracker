"use client";

import { memo, type Dispatch } from "react";
import { AlertTriangle, Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { LOW_CONFIDENCE } from "@/lib/import/types";
import { cn } from "@/lib/utils";
import { CATEGORY_KINDS } from "@/lib/validation";
import type { Category } from "@/lib/data";
import { TRANSFER, rowAmount, rulePatternFor, type ReviewAction, type ReviewRow as Row } from "./review-state";

type ReviewRowProps = {
  row: Row;
  categories: Category[];
  dispatch: Dispatch<ReviewAction>;
  onCreateRule: (key: string) => void;
  ruleBusy: boolean;
};

export const ReviewRow = memo(function ReviewRow({ row, categories, dispatch, onCreateRule, ruleBusy }: ReviewRowProps) {
  const { t } = useI18n();
  const cents = rowAmount(row);
  const low = row.confidence < LOW_CONFIDENCE;
  const update = (patch: Partial<Row>) => dispatch({ type: "update", key: row.key, patch });
  const id = (field: string) => `${row.key}-${field}`;

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_1fr_8rem] items-start gap-x-3 gap-y-2 border-l-4 border-transparent p-3",
        "md:grid-cols-[auto_9.5rem_8rem_1fr_13rem] md:items-center",
        (low || cents === null) && "border-amber-500 bg-amber-500/5",
        row.duplicate === "exact" && "border-muted-foreground/40",
        !row.include && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={row.include}
        onChange={(e) => update({ include: e.target.checked })}
        aria-label={t.importer.include}
        className="mt-2.5 size-4 accent-primary md:mt-0"
      />

      <Input
        id={id("date")}
        type="date"
        aria-label={t.importer.date}
        value={row.date}
        onChange={(e) => e.target.value && update({ date: e.target.value })}
        className="md:order-none"
      />

      <Input
        id={id("amount")}
        inputMode="decimal"
        aria-label={t.importer.amount}
        aria-invalid={cents === null}
        value={row.amountInput}
        onChange={(e) => update({ amountInput: e.target.value })}
        className={cn(
          "text-right tabular-nums",
          cents !== null && cents > 0 && "text-emerald-600 dark:text-emerald-400",
        )}
      />

      <div className="col-span-full grid gap-1 md:col-span-1">
        <Input
          id={id("description")}
          aria-label={t.importer.description}
          value={row.description}
          onChange={(e) => update({ description: e.target.value })}
        />
        {row.merchant && <p className="truncate px-1 text-xs text-muted-foreground">{row.merchant}</p>}
      </div>

      <div className="col-span-full grid gap-1 md:col-span-1">
        <NativeSelect
          aria-label={t.importer.category}
          value={row.category}
          onChange={(e) => dispatch({ type: "setCategory", key: row.key, category: e.target.value })}
          className="w-full"
        >
          <NativeSelectOption value="">{t.importer.noCategory}</NativeSelectOption>
          {CATEGORY_KINDS.map((kind) => (
            <NativeSelectOptGroup key={kind} label={t.categories.kinds[kind]}>
              {categories
                .filter((c) => c.kind === kind)
                .map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
            </NativeSelectOptGroup>
          ))}
          <NativeSelectOption value={TRANSFER}>{t.importer.transfer}</NativeSelectOption>
        </NativeSelect>
        {row.categorySource === "rule" && (
          <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <Wand2 className="size-3" />
            {t.importer.fromRule}
          </p>
        )}
      </div>

      {(low || cents === null || row.duplicate) && (
        <div className="col-span-full flex flex-wrap gap-x-4 gap-y-1 text-xs md:col-start-2">
          {cents === null && <span className="text-destructive">{t.importer.invalidAmount}</span>}
          {low && (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              {t.importer.check}: {row.warnings.map((w) => t.importer.warnings[w]).join(", ")}
            </span>
          )}
          {row.duplicate && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Copy className="size-3.5" />
              {row.duplicate === "exact" ? t.importer.duplicate : t.importer.possibleDuplicate}
            </span>
          )}
        </div>
      )}

      {row.rulePrompt && (
        <div className="col-span-full flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm md:col-start-2">
          <Wand2 className="size-4 text-muted-foreground" />
          <span className="flex-1">{fmt(t.importer.rulePrompt, { pattern: rulePatternFor(row).pattern })}</span>
          <Button size="sm" onClick={() => onCreateRule(row.key)} disabled={ruleBusy}>
            {t.importer.ruleCreate}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => update({ rulePrompt: false })}>
            {t.importer.ruleDismiss}
          </Button>
        </div>
      )}
    </li>
  );
});
