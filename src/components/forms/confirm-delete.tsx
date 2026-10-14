"use client";

import { useState, useTransition, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { ActionState } from "@/lib/actions/shared";
import { FormError } from "./field";

type ConfirmDeleteProps = {
  title: string;
  description: string;
  /** Server action; may redirect on success. */
  onConfirm: () => Promise<ActionState>;
  trigger: ReactElement;
};

export function ConfirmDelete({ title, description, onConfirm, trigger }: ConfirmDeleteProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ActionState["error"]>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? t.common.deleting : t.common.delete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
