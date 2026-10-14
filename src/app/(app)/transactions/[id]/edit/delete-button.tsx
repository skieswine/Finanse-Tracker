"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/lib/actions/transactions";
import { useI18n } from "@/lib/i18n/client";

export function DeleteTransactionButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ConfirmDelete
      title={t.transactions.deleteTitle}
      description={t.transactions.deleteDescription}
      onConfirm={() => deleteTransaction(id)}
      trigger={
        <Button variant="destructive" size="lg" className="h-10">
          <Trash2 />
          <span className="hidden sm:inline">{t.common.delete}</span>
        </Button>
      }
    />
  );
}
