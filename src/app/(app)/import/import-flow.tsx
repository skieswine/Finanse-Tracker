"use client";

import { useMemo, useReducer, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { checkDuplicates, importTransactions } from "@/lib/actions/import";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { dedupeHashes } from "@/lib/import/dedupe";
import { ExtractError, detectFileType, extractDocument, type ExtractProgress } from "@/lib/import/extract";
import { pickParser } from "@/lib/import/registry";
import { sortRules, type CategoryRule } from "@/lib/import/rules";
import type { SourceFileType } from "@/lib/import/types";
import { MAX_IMPORT_ROWS } from "@/lib/validation";
import { BASE_CURRENCY, isCurrency, type Currency } from "@/lib/currency";
import type { Account, Category, ImportBatch } from "@/lib/data";
import { ReviewStep } from "./review-step";
import { TRANSFER, buildReviewRows, reviewReducer, rowAmount } from "./review-state";
import { ImportHistory } from "./import-history";
import { UploadStep } from "./upload-step";

type Phase =
  | { step: "upload"; error?: string }
  | { step: "processing"; progress: ExtractProgress | "checking" }
  | { step: "review"; fileName: string; fileType: SourceFileType; parserId: string; error?: string }
  | { step: "done"; count: number };

type ImportFlowProps = {
  categories: Category[];
  accounts: Account[];
  rules: CategoryRule[];
  batches: ImportBatch[];
};

export function ImportFlow({ categories, accounts, rules, batches }: ImportFlowProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>({ step: "upload" });
  const [rows, dispatch] = useReducer(reviewReducer, []);
  const [accountId, setAccountId] = useState(accounts.length === 1 ? accounts[0].id : "");
  const [saving, startSaving] = useTransition();
  const sortedRules = useMemo(() => sortRules(rules), [rules]);
  // Statement amounts are in the selected account's currency; without an account,
  // in the currency the parser implies (monobank → UAH) or one picked on review.
  const [fileCurrency, setFileCurrency] = useState<Currency>(BASE_CURRENCY);
  const accountCurrency = accounts.find((a) => a.id === accountId)?.currency;
  const currency: Currency = isCurrency(accountCurrency) ? accountCurrency : fileCurrency;

  async function handleFile(file: File) {
    const type = detectFileType(file);
    if (!type) {
      setPhase({ step: "upload", error: t.importer.errors.unsupported });
      return;
    }
    try {
      setPhase({ step: "processing", progress: { stage: "reading", progress: 0 } });
      const doc = await extractDocument(file, type, (progress) => setPhase({ step: "processing", progress }));
      const parser = pickParser(doc);
      const parsed = parser.parse(doc);
      const statementCurrency = isCurrency(accountCurrency) ? accountCurrency : (parser.currency ?? BASE_CURRENCY);
      setFileCurrency(parser.currency ?? BASE_CURRENCY);
      if (parsed.length === 0) {
        setPhase({ step: "upload", error: t.importer.errors.noRows });
        return;
      }
      if (parsed.length > MAX_IMPORT_ROWS) {
        setPhase({ step: "upload", error: fmt(t.importer.errors.tooMany, { max: MAX_IMPORT_ROWS }) });
        return;
      }

      setPhase({ step: "processing", progress: "checking" });
      const hashes = await dedupeHashes(parsed);
      const dates = parsed.map((p) => p.date).sort();
      const duplicates = await checkDuplicates({ hashes, from: dates[0], to: dates[dates.length - 1] });

      dispatch({ type: "reset", rows: buildReviewRows(parsed, hashes, duplicates, sortedRules, statementCurrency) });
      setPhase({ step: "review", fileName: file.name, fileType: type, parserId: parser.id });
    } catch (error) {
      const code = error instanceof ExtractError ? error.code : "failed";
      setPhase({ step: "upload", error: code === "empty" ? t.importer.errors.empty : t.importer.errors.failed });
    }
  }

  function confirm() {
    if (phase.step !== "review") return;
    const selected = rows.filter((r) => r.include);
    startSaving(async () => {
      const result = await importTransactions({
        file_name: phase.fileName,
        file_type: phase.fileType,
        parser_id: phase.parserId,
        account_id: accountId || null,
        currency,
        rows: selected.map((r) => ({
          date: r.date,
          amount_cents: rowAmount(r) ?? 0,
          description: r.description,
          merchant: r.merchant,
          category_id: r.category && r.category !== TRANSFER ? r.category : null,
          is_transfer: r.category === TRANSFER,
          dedupe_hash: r.dedupe_hash,
        })),
      });
      if (result.ok) {
        dispatch({ type: "reset", rows: [] });
        setPhase({ step: "done", count: result.count });
      } else {
        setPhase({ ...phase, error: t.validation[result.error] });
      }
    });
  }

  switch (phase.step) {
    case "upload":
      return (
        <>
          <UploadStep
            accounts={accounts}
            accountId={accountId}
            onAccountChange={setAccountId}
            onFile={handleFile}
            currency={currency}
            error={phase.error}
          />
          <ImportHistory batches={batches} />
        </>
      );

    case "processing": {
      const p = phase.progress;
      const label =
        p === "checking"
          ? t.importer.checking
          : p.stage === "ocr"
            ? fmt(t.importer.ocr, { pct: Math.round(p.progress * 100) })
            : t.importer.reading;
      return (
        <Card className="items-center gap-4 px-6 py-12 text-center" aria-busy="true">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p role="status">{label}</p>
          {p !== "checking" && p.progress > 0 && (
            <ProgressBar value={p.progress} label={label} className="max-w-xs" />
          )}
        </Card>
      );
    }

    case "review":
      return (
        <ReviewStep
          fileName={phase.fileName}
          currency={currency}
          // The account fixes the currency; without one the user may correct it.
          onCurrencyChange={isCurrency(accountCurrency) ? undefined : setFileCurrency}
          rows={rows}
          dispatch={dispatch}
          categories={categories}
          onConfirm={confirm}
          onCancel={() => {
            dispatch({ type: "reset", rows: [] });
            setPhase({ step: "upload" });
          }}
          saving={saving}
          error={phase.error}
        />
      );

    case "done":
      return (
        <Card className="items-center gap-3 px-6 py-12 text-center">
          <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold">{t.importer.doneTitle}</h2>
          <p className="text-muted-foreground">{fmt(t.importer.doneDescription, { count: phase.count })}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link href="/transactions" className={buttonVariants()}>
              {t.importer.toTransactions}
            </Link>
            <Button variant="outline" onClick={() => setPhase({ step: "upload" })}>
              {t.importer.another}
            </Button>
          </div>
        </Card>
      );
  }
}
