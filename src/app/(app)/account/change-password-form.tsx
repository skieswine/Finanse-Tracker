"use client";

import { Field, FormError, SubmitButton, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";

export function ChangePasswordForm() {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(changePassword);
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:max-w-sm" noValidate>
      <Field id="password" label={t.account.newPassword} error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" {...errorProps("password", fe.password)} />
      </Field>
      <Field id="password2" label={t.account.newPassword2} error={fe.password2}>
        <Input id="password2" name="password2" type="password" autoComplete="new-password" {...errorProps("password2", fe.password2)} />
      </Field>
      <FormError error={state.error} />
      {state.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {t.account.passwordChanged}
        </p>
      )}
      <SubmitButton pending={pending} className="h-10 justify-self-start px-6" />
    </form>
  );
}
