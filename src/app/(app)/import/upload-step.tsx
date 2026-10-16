"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileUp, ScanText, ShieldCheck, type LucideIcon } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/data";

type UploadStepProps = {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  onFile: (file: File) => void;
  error?: string;
  /** Technical cause, small print under the error. */
  errorDetail?: string;
  currency: string;
};

const FORMATS = ["CSV", "PDF", "DOCX", "PNG", "JPG"];

const ACCEPT = ".csv,.txt,.pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp,image/*,text/csv,application/pdf";

export function UploadStep({ accounts, accountId, onAccountChange, onFile, error, errorDetail, currency }: UploadStepProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="grid gap-4">
      {accounts.length > 0 && (
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="import-account">{t.importer.account}</Label>
          <NativeSelect
            id="import-account"
            value={accountId}
            onChange={(e) => onAccountChange(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">{t.transactions.noAccount}</NativeSelectOption>
            {accounts.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.currency !== "EUR" ? `${a.name} · ${a.currency}` : a.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {currency !== "EUR" && (
            <p className="text-sm text-muted-foreground">{fmt(t.importer.currencyNote, { currency })}</p>
          )}
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          dragging && "border-primary bg-muted/60",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <FileUp className="size-6 text-muted-foreground" />
        </span>
        <span className="font-medium">{t.importer.uploadTitle}</span>
        <span className="max-w-md text-sm text-muted-foreground">{t.importer.uploadHint}</span>
        <span className="flex flex-wrap justify-center gap-1.5" aria-hidden="true">
          {FORMATS.map((f) => (
            <span key={f} className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {f}
            </span>
          ))}
        </span>
        <span className="mt-1 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          {t.importer.chooseFile}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            // Allow picking the same file again after an error.
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </label>

      {error && (
        <div role="alert" className="grid gap-1 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          {errorDetail && <p className="font-mono text-xs break-all opacity-80">{errorDetail}</p>}
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-3">
        <Tip icon={ShieldCheck} tone="text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" title={t.importer.tipPrivacyTitle}>
          {t.importer.privacy}
        </Tip>
        <Tip icon={FileSpreadsheet} tone="text-series-income bg-series-income/10" title={t.importer.tipCsvTitle}>
          {t.importer.csvTip}
        </Tip>
        <Tip icon={ScanText} tone="text-series-expense bg-series-expense/10" title={t.importer.tipOcrTitle}>
          {t.importer.ocrNote}
        </Tip>
      </ul>
    </div>
  );
}

function Tip({ icon: Icon, tone, title, children }: { icon: LucideIcon; tone: string; title: string; children: string }) {
  return (
    <li className="flex gap-3 rounded-xl border bg-card p-4">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-4.5" />
      </span>
      <div className="grid gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
