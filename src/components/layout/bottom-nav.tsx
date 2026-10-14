"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { bottomNavItems, isActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t.nav.mainMenu}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {bottomNavItems.map((item) => {
          const { href, labelKey, icon: Icon } = item;
          const active = isActive(pathname, item);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate px-1">{t.nav[labelKey]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
