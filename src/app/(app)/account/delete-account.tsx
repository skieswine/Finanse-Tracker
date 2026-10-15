"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { FormError } from "@/components/forms/field";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/lib/actions/account";
import type { ActionState } from "@/lib/actions/shared";
import { useI18n } from "@/lib/i18n/client";

/** Account deletion, confirmed by typing the account's email. */
export function DeleteAccount({ email }: { email: string }) {
  const { t } = useI18n();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<ActionState["error"]>();
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog
      onOpenChange={() => {
        setTyped("");
        setError(undefined);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="destructive">
            <Trash2 />
            {t.account.deleteAccount}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.account.deleteAccount}</AlertDialogTitle>
          <AlertDialogDescription>{t.account.deleteAccountDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="confirm-email">{t.account.deleteAccountConfirm}</Label>
          <Input
            id="confirm-email"
            type="email"
            autoComplete="off"
            placeholder={email}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <FormError error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAccount(typed);
                if (result.error) setError(result.error);
              })
            }
          >
            {pending ? t.common.deleting : t.account.deleteAccountButton}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
