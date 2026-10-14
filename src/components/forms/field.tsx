"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/client";
import type { ValidationKey } from "@/lib/validation";

export function useValidationMessage() {
  const { t } = useI18n();
  return (key: ValidationKey | undefined) =>
    key ? (t.validation[key] ?? t.validation.invalid) : undefined;
}

type FieldProps = {
  id: string;
  label: string;
  error?: ValidationKey;
  optional?: boolean;
  children: ReactNode;
};

/** Label + control + translated error. The control must use `id`. */
export function Field({ id, label, error, optional, children }: FieldProps) {
  const { t } = useI18n();
  const message = useValidationMessage()(error);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground">({t.common.optional})</span>
        )}
      </Label>
      {children}
      {message && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function errorProps(id: string, error: ValidationKey | undefined) {
  return error
    ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
    : {};
}

export function FormError({ error }: { error?: ValidationKey }) {
  const message = useValidationMessage()(error);
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, className }: { pending: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <Button type="submit" size="lg" className={className ?? "h-10"} disabled={pending}>
      {pending ? t.common.saving : t.common.save}
    </Button>
  );
}
