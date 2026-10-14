"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Mobile floating "add transaction" button, above the bottom nav. */
export function AddFab() {
  const pathname = usePathname();
  const { t } = useI18n();
  // Hidden on the transaction form and on import (it has its own sticky bar).
  if (pathname.startsWith("/transactions/") || pathname.startsWith("/import")) return null;

  return (
    <Link
      href="/transactions/new"
      aria-label={t.nav.addTransaction}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
    >
      <Plus className="size-6" />
    </Link>
  );
}
