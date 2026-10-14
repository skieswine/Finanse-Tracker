import Link from "next/link";
import { ChevronRight, FileBarChart, LogOut, type LucideIcon } from "lucide-react";
import { settingsItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/lib/auth/actions";
import { getDictionary } from "@/lib/i18n/server";

// Mobile overflow menu for pages that don't fit in the bottom nav.
export default async function MorePage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.more.title} />
      <div className="grid gap-4">
        <LinkList links={[{ href: "/reports", label: t.nav.reports, icon: FileBarChart }]} />

        <section>
          <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground">{t.nav.settings}</h2>
          <LinkList
            links={settingsItems.map(({ href, labelKey, icon }) => ({ href, label: t.nav[labelKey], icon }))}
          />
        </section>

        <Card className="gap-0 divide-y py-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span>{t.language.label}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span>{t.more.appearance}</span>
            <ThemeToggle />
          </div>
        </Card>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="h-10 w-full">
            <LogOut />
            {t.auth.logout}
          </Button>
        </form>
      </div>
    </>
  );
}

function LinkList({ links }: { links: { href: string; label: string; icon: LucideIcon }[] }) {
  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3">
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
