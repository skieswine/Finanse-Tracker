"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Field, FormError, SubmitButton, errorProps } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvite, deleteInvite } from "@/lib/actions/account";
import { formatDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALE, fmt } from "@/lib/i18n/types";
import type { Invite } from "@/lib/data";

export function Invites({ invites }: { invites: Invite[] }) {
  const { t, locale } = useI18n();
  const { state, onSubmit, pending } = useFormAction(createInvite);
  const fe = state.fieldErrors ?? {};
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(code: string) {
    const link = `${window.location.origin}/register?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      window.prompt(t.account.copyLink, link);
    }
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{t.account.invitesHint}</p>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end" noValidate>
        <Field id="max_uses" label={t.account.maxUses} error={fe.max_uses}>
          <Input id="max_uses" name="max_uses" type="number" min={1} max={100} defaultValue={1} {...errorProps("max_uses", fe.max_uses)} />
        </Field>
        <Field id="expires_days" label={t.account.expiresDays} error={fe.expires_days}>
          <Input id="expires_days" name="expires_days" type="number" min={0} max={365} defaultValue={14} {...errorProps("expires_days", fe.expires_days)} />
        </Field>
        <Field id="note" label={t.account.note} optional error={fe.note}>
          <Input id="note" name="note" maxLength={100} {...errorProps("note", fe.note)} />
        </Field>
        <SubmitButton pending={pending} className="h-10" />
        <div className="sm:col-span-full">
          <FormError error={state.error} />
        </div>
      </form>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.account.noInvites}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invites.map((inv) => {
            const expired = inv.expired;
            const usedUp = inv.uses >= inv.max_uses;
            const status = expired
              ? t.account.inviteExpired
              : usedUp
                ? t.account.inviteUsedUp
                : inv.expires_at
                  ? fmt(t.account.inviteExpires, { date: formatDate(inv.expires_at.slice(0, 10), INTL_LOCALE[locale]) })
                  : null;
            return (
              <li key={inv.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium tracking-wider">{inv.code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[inv.note, fmt(t.account.inviteUses, { uses: inv.uses, max: inv.max_uses }), status]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!expired && !usedUp && (
                  <Button variant="outline" size="sm" onClick={() => copy(inv.code)}>
                    {copied === inv.code ? <Check /> : <Copy />}
                    {copied === inv.code ? t.account.copied : t.account.copyLink}
                  </Button>
                )}
                <ConfirmDelete
                  title={fmt(t.account.deleteInviteTitle, { code: inv.code })}
                  description={t.account.deleteInviteDescription}
                  onConfirm={() => deleteInvite(inv.code)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={t.common.delete}>
                      <Trash2 />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
