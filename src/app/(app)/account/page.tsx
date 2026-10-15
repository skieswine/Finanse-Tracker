import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitesForAdmin } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/types";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccount } from "./delete-account";
import { Invites } from "./invites";

export default async function AccountPage() {
  const supabase = await createClient();
  const [{ t }, { data }, invites] = await Promise.all([getI18n(), supabase.auth.getClaims(), getInvitesForAdmin()]);
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";

  return (
    <>
      <PageHeader title={t.account.title} />
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">{fmt(t.account.signedInAs, { email })}</p>

        <Card>
          <CardHeader>
            <CardTitle>{t.account.password}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">{t.account.googleHint}</p>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* Only admins (ADMIN_EMAILS) get a list — null for everyone else. */}
        {invites && (
          <Card>
            <CardHeader>
              <CardTitle>{t.account.invites}</CardTitle>
            </CardHeader>
            <CardContent>
              <Invites invites={invites} />
            </CardContent>
          </Card>
        )}

        <Card className="ring-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">{t.account.danger}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">{t.account.deleteAccountDescription}</p>
            <div>
              <DeleteAccount email={email} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
