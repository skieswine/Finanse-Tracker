"use client";

import { FileText, Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteImportBatch } from "@/lib/actions/import";
import { formatDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALE, fmt } from "@/lib/i18n/types";
import type { ImportBatch } from "@/lib/data";

/** Recent imports, each can be undone (deletes its transactions). */
export function ImportHistory({ batches }: { batches: ImportBatch[] }) {
  const { t, locale } = useI18n();
  if (batches.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground">{t.importer.historyTitle}</h2>
      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {batches.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(b.created_at.slice(0, 10), INTL_LOCALE[locale])} ·{" "}
                  {fmt(t.importer.historyRows, { count: b.transaction_count })}
                </p>
              </div>
              <ConfirmDelete
                title={fmt(t.importer.undoTitle, { file: b.file_name })}
                description={fmt(t.importer.undoDescription, { count: b.transaction_count })}
                onConfirm={() => deleteImportBatch(b.id)}
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 />
                    <span className="hidden sm:inline">{t.importer.undo}</span>
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
