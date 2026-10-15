"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { isActive, settingsItems, sidebarItems, type NavItem } from "./nav-items";

export function Sidebar({ email }: { email: string | null }) {
  const { t } = useI18n();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <Link href="/" className="flex h-14 items-center gap-2 px-4 font-semibold hover:opacity-80">
        <Wallet className="size-5" />
        {t.app.name}
      </Link>

      <div className="px-3 pb-3">
        <Link href="/transactions/new" className={buttonVariants({ className: "h-9 w-full" })}>
          <Plus />
          {t.nav.addTransaction}
        </Link>
      </div>

      <nav aria-label={t.nav.mainMenu} className="flex-1 overflow-y-auto px-2">
        <NavList items={sidebarItems} />
        <p className="mt-6 mb-1 px-3 text-xs font-medium text-muted-foreground">{t.nav.settings}</p>
        <NavList items={settingsItems} />
      </nav>

      <div className="grid gap-2 border-t p-3">
        {email && (
          <p className="truncate px-1 text-xs text-muted-foreground" title={email}>
            {email}
          </p>
        )}
        <LanguageSwitcher className="w-full [&_select]:w-full" />
        <div className="flex items-center justify-between">
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut />
              {t.auth.logout}
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const { href, labelKey, icon: Icon } = item;
        // "Add transaction" has its own button; don't highlight Transactions for it.
        const active = isActive(pathname, item) && pathname !== "/transactions/new";
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.nav[labelKey]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
