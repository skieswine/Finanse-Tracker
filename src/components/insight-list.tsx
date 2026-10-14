import Link from "next/link";
import { AlertTriangle, ChevronRight, CircleAlert, Info } from "lucide-react";
import type { Sentence, Tone } from "@/lib/insight-sentences";
import { cn } from "@/lib/utils";

// Status is carried by an icon + the sentence itself, never by colour alone.
const TONE: Record<Tone, { icon: typeof Info; className: string }> = {
  neutral: { icon: Info, className: "text-muted-foreground" },
  warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
  critical: { icon: CircleAlert, className: "text-destructive" },
};

export function InsightList({ items, empty }: { items: Sentence[]; empty?: string }) {
  if (items.length === 0) {
    return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  }
  return (
    <ul className="grid gap-1">
      {items.map((s, i) => {
        const { icon: Icon, className } = TONE[s.tone];
        const body = (
          <>
            <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden="true" />
            <span className="flex-1">{s.text}</span>
            {s.href && <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </>
        );
        return (
          <li key={i}>
            {s.href ? (
              <Link href={s.href} className="-mx-2 flex gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                {body}
              </Link>
            ) : (
              <div className="flex gap-2.5 py-1.5 text-sm">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
