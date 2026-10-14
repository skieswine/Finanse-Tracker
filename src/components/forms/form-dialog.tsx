"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/actions/shared";
import type { FieldErrors } from "@/lib/validation";
import { FormError, SubmitButton } from "./field";
import { useFormAction } from "./use-form-action";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type FormDialogProps = {
  title: string;
  trigger: ReactElement;
  action: Action;
  /** Render the fields; receives the latest field errors. */
  children: (fieldErrors: FieldErrors) => ReactNode;
};

/** Dialog with a create/edit form that closes when the action returns ok. */
export function FormDialog({ title, trigger, action, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts with a clean state. */}
        {open && (
          <DialogForm action={action} onDone={() => setOpen(false)}>
            {children}
          </DialogForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogForm({
  action,
  onDone,
  children,
}: {
  action: Action;
  onDone: () => void;
  children: FormDialogProps["children"];
}) {
  const { state, onSubmit, pending } = useFormAction(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone();
    return result;
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {children(state.fieldErrors ?? {})}
      <FormError error={state.error} />
      <SubmitButton pending={pending} className="h-10 w-full" />
    </form>
  );
}
