"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type Dispatch } from "react";
import { AlertTriangle, CheckSquare, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createRule } from "@/lib/actions/import";
import { ruleMatches } from "@/lib/import/rules";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/data";
import { ReviewRow } from "./review-row";
import { TRANSFER, isFlagged, rowAmount, rulePatternFor, type ReviewAction, type ReviewRow as Row } from "./review-state";

type ReviewStepProps = {
  fileName: string;
  rows: Row[];
  dispatch: Dispatch<ReviewAction>;
  categories: Category[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
};

export function ReviewStep({ fileName, rows, dispatch, categories, onConfirm, onCancel, saving, error }: ReviewStepProps) {
  const { t } = useI18n();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [ruleMessage, setRuleMessage] = useState<string>();
  const [ruleBusy, startRule] = useTransition();

  const flaggedCount = useMemo(() => rows.filter(isFlagged).length, [rows]);
  const visible = useMemo(() => (onlyFlagged ? rows.filter(isFlagged) : rows), [rows, onlyFlagged]);

  const summary = useMemo(() => {
    let selected = 0;
    let income = 0;
    let expenses = 0;
    let invalid = 0;
    for (const r of rows) {
      if (!r.include) continue;
      selected++;
      const cents = rowAmount(r);
      if (cents === null) invalid++;
      else if (r.category === TRANSFER) continue;
      else if (cents > 0) income += cents;
      else expenses += cents;
    }
    return { selected, income, expenses, invalid };
  }, [rows]);

  // Latest rows for the (stable) rule callback, so memoised rows don't all re-render.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const allVisibleIncluded = visible.length > 0 && visible.every((r) => r.include);
  const noneVisibleIncluded = visible.every((r) => !r.include);
  const setIncluded = (include: boolean) =>
    dispatch({ type: "includeAll", include, keys: visible.map((r) => r.key) });

  const onCreateRule = useCallback(
    (key: string) => {
      const current = rowsRef.current;
      const row = current.find((r) => r.key === key);
      if (!row || !row.category) return;
      startRule(async () => {
        const result = await createRule({ ...rulePatternFor(row), category_id: row.category });
        if (!result.ok) {
          setRuleMessage(t.validation.saveFailed);
          return;
        }
        // Count rows the rule will newly categorise (excluding the source row).
        const affected = current.filter(
          (r) =>
            r.key !== key &&
            r.categorySource !== "manual" &&
            r.category !== result.rule.category_id &&
            ruleMatches(result.rule, r),
        ).length;
        dispatch({ type: "applyRule", rule: result.rule });
        dispatch({ type: "update", key, patch: { rulePrompt: false } });
        setRuleMessage(fmt(t.importer.ruleCreated, { count: affected }));
      });
    },
    [dispatch, t],
  );

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{fmt(t.importer.found, { count: rows.length, file: fileName })}</p>

      {/* Selection toolbar: explicit buttons instead of a lone checkbox. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIncluded(true)}
          disabled={allVisibleIncluded}
        >
          <CheckSquare />
          {t.importer.selectAll} ({visible.length})
        </Button>
        <Button variant="outline" onClick={() => setIncluded(false)} disabled={noneVisibleIncluded}>
          <Square />
          {t.transactions.deselectAll}
        </Button>
        {flaggedCount > 0 && (
          <Button
            variant={onlyFlagged ? "secondary" : "ghost"}
            aria-pressed={onlyFlagged}
            onClick={() => setOnlyFlagged((v) => !v)}
            className={cn(onlyFlagged && "ring-1 ring-amber-500")}
          >
            <AlertTriangle className="text-amber-600 dark:text-amber-400" />
            {fmt(t.importer.onlyFlagged, { count: flaggedCount })}
          </Button>
        )}
        <span className="ml-auto text-sm font-medium tabular-nums">
          {fmt(t.importer.selected, { selected: summary.selected, total: rows.length })}
        </span>
      </div>

      {ruleMessage && (
        <p role="status" className="rounded-lg bg-muted px-4 py-2 text-sm">
          {ruleMessage}
        </p>
      )}

      <Card className="gap-0 py-0">
        <div className="hidden grid-cols-[auto_9.5rem_8rem_1fr_13rem] items-center gap-3 border-b border-l-4 border-l-transparent px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
          <input
            type="checkbox"
            aria-label={t.importer.selectAll}
            title={t.importer.selectAll}
            className="size-5 cursor-pointer accent-primary"
            checked={allVisibleIncluded}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleIncluded && !noneVisibleIncluded;
            }}
            onChange={(e) => setIncluded(e.target.checked)}
          />
          <span>{t.importer.date}</span>
          <span className="text-right">{t.importer.amount}</span>
          <span>{t.importer.description}</span>
          <span>{t.importer.category}</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t.importer.nothingVisible}</p>
        ) : (
          <ul className="divide-y">
            {visible.map((row) => (
              <ReviewRow
                key={row.key}
                row={row}
                categories={categories}
                dispatch={dispatch}
                onCreateRule={onCreateRule}
                ruleBusy={ruleBusy}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Sticky summary; sits above the mobile bottom nav. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 md:bottom-4">
        <Card className="flex-row flex-wrap items-center gap-3 px-4 py-3 shadow-lg">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              {fmt(t.importer.selected, { selected: summary.selected, total: rows.length })}
            </p>
            <p className="tabular-nums text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">{formatEUR(summary.income, { signed: true })}</span>
              {" · "}
              {formatEUR(summary.expenses, { signed: true })}
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {t.importer.cancel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving || summary.selected === 0 || summary.invalid > 0}
            className="h-9"
          >
            {saving ? t.importer.importing : fmt(t.importer.confirm, { count: summary.selected })}
          </Button>
          {(error || summary.invalid > 0) && (
            <p role="alert" className="w-full text-sm text-destructive">
              {error ?? t.importer.invalidAmount}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
