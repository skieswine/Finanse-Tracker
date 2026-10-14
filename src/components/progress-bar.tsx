import { cn } from "@/lib/utils";

type ProgressBarProps = {
  /** 0..1+, values above 1 are drawn full and flagged. */
  value: number;
  label: string;
  color?: string;
  className?: string;
};

export function ProgressBar({ value, label, color, className }: ProgressBarProps) {
  const over = value > 1;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", over ? "bg-destructive" : !color && "bg-primary")}
        style={{ width: `${pct}%`, backgroundColor: over ? undefined : color }}
      />
    </div>
  );
}
