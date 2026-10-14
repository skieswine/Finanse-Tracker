import { AddFab } from "@/components/layout/add-fab";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <div className="flex min-h-dvh">
      <Sidebar email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8">
          {children}
        </main>
      </div>
      <AddFab />
      <BottomNav />
    </div>
  );
}
