import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  cents: number;
  icon: LucideIcon;
  hint?: string;
  /** Show a +/− sign and red when negative (for net). */
  signed?: boolean;
  /** Round to whole euros (overview screens). */
  whole?: boolean;
};

export function StatCard({ label, cents, icon: Icon, hint, signed, whole }: StatCardProps) {
  return (
    <Card className="gap-1 px-4 py-4" title={hint}>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </p>
      <p
        className={cn(
          "truncate text-xl font-semibold tabular-nums sm:text-2xl",
          signed && cents < 0 && "text-destructive",
        )}
      >
        {formatEUR(cents, { signed, whole })}
      </p>
      {hint && <p className="hidden text-xs text-muted-foreground sm:block">{hint}</p>}
    </Card>
  );
}
