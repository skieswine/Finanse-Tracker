"use client";

import { useState } from "react";
import { Field, FormError, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerWithGoogle, registerWithInvite } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Mode = "google" | "password";

export function RegisterForm({ code }: { code: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("google");
  const [codeValue, setCodeValue] = useState(code);

  return (
    <div className="grid gap-4">
      {/* Mode switch: same invite code, two ways to sign up. */}
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["google", "password"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors",
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "google" ? t.register.modeGoogle : t.register.modePassword}
          </button>
        ))}
      </div>

      {mode === "google" ? (
        <GoogleRegister code={codeValue} onCodeChange={setCodeValue} />
      ) : (
        <PasswordRegister code={codeValue} onCodeChange={setCodeValue} />
      )}
    </div>
  );
}

type CodeProps = { code: string; onCodeChange: (code: string) => void };

function CodeField({ code, onCodeChange, error }: CodeProps & { error?: Parameters<typeof errorProps>[1] }) {
  const { t } = useI18n();
  return (
    <Field id="code" label={t.register.code} error={error}>
      <Input
        id="code"
        name="code"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="ABCD-2345"
        className="font-mono tracking-wider uppercase"
        {...errorProps("code", error)}
      />
    </Field>
  );
}

function GoogleRegister({ code, onCodeChange }: CodeProps) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(registerWithGoogle);
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <CodeField code={code} onCodeChange={onCodeChange} error={fe.code} />
      <Field id="gmail" label={t.register.gmail} error={fe.email}>
        <Input
          id="gmail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@gmail.com"
          {...errorProps("gmail", fe.email)}
        />
      </Field>
      <p className="text-sm text-muted-foreground">{t.register.googleHint}</p>
      <FormError error={state.error} />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? t.auth.googleRedirecting : t.register.continueGoogle}
      </Button>
    </form>
  );
}

function PasswordRegister({ code, onCodeChange }: CodeProps) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useFormAction(registerWithInvite);
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <CodeField code={code} onCodeChange={onCodeChange} error={fe.code} />
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
