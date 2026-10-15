import Link from "next/link";
import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getDictionary } from "@/lib/i18n/server";

export async function MobileHeader() {
  const t = await getDictionary();
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      {/* Logo goes home (Overview); -mx/px keep a comfortable tap area. */}
      <Link href="/" className="-mx-2 flex h-11 items-center gap-2 rounded-lg px-2 font-semibold active:bg-muted">
        <Wallet className="size-5" />
        {t.app.name}
      </Link>
      <ThemeToggle />
    </header>
  );
}
