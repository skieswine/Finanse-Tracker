"use client";

import { Field, FormError, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerWithInvite } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";

export function RegisterForm({ code }: { code: string }) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(registerWithInvite);
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="code" label={t.register.code} error={fe.code}>
        <Input
          id="code"
          name="code"
          defaultValue={code}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABCD-2345"
          className="font-mono tracking-wider uppercase"
          {...errorProps("code", fe.code)}
        />
      </Field>
      <Field id="email" label={t.register.email} error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" {...errorProps("email", fe.email)} />
      </Field>
      <Field id="password" label={t.register.password} error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" {...errorProps("password", fe.password)} />
      </Field>
      <Field id="password2" label={t.register.password2} error={fe.password2}>
        <Input id="password2" name="password2" type="password" autoComplete="new-password" {...errorProps("password2", fe.password2)} />
      </Field>
      <FormError error={state.error} />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? t.register.submitting : t.register.submit}
      </Button>
    </form>
  );
}
