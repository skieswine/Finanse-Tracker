"use client";

import { Field, FormError, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";

export function ForgotForm() {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(requestPasswordReset);
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
        {t.forgot.sent}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="email" label={t.auth.email} error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" {...errorProps("email", fe.email)} />
      </Field>
      <FormError error={state.error} />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {t.forgot.submit}
      </Button>
    </form>
  );
}
