"use client";

import type { ReactElement } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/shared";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type RowActionsProps = {
  /** Renders the edit dialog around the given trigger button. */
  editDialog: (trigger: ReactElement) => ReactElement;
  deleteTitle: string;
  deleteDescription: string;
  onDelete: () => Promise<ActionState>;
};

// 44px touch targets on phones (Apple HIG), compact on desktop.
const TOUCH = "size-11 md:size-9 [&_svg:not([class*=size-])]:size-5 md:[&_svg:not([class*=size-])]:size-4";

/** Edit + delete icon buttons for a settings list row. */
export function RowActions({ editDialog, deleteTitle, deleteDescription, onDelete }: RowActionsProps) {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 items-center gap-1 md:gap-0">
      {editDialog(
        <Button variant="ghost" size="icon" className={TOUCH} aria-label={t.common.edit}>
          <Pencil />
        </Button>,
      )}
      <ConfirmDelete
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className={cn(TOUCH, "text-destructive/80 hover:bg-destructive/10 hover:text-destructive")}
            aria-label={t.common.delete}
          >
            <Trash2 />
          </Button>
        }
      />
    </div>
  );
}
