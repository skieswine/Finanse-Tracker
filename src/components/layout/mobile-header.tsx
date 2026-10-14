import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getDictionary } from "@/lib/i18n/server";

export async function MobileHeader() {
  const t = await getDictionary();
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <div className="flex items-center gap-2 font-semibold">
        <Wallet className="size-5" />
        {t.app.name}
      </div>
      <ThemeToggle />
    </header>
  );
}
