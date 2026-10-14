import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { addMonths, formatMonth } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/types";

type MonthSwitcherProps = {
  month: string;
  basePath: string;
  intlLocale: string;
  t: Dictionary;
};

/** Prev / current / next month, driven by the `?month=YYYY-MM` param. */
export function MonthSwitcher({ month, basePath, intlLocale, t }: MonthSwitcherProps) {
  const link = (m: string) => `${basePath}?month=${m}`;
  return (
    <div className="flex items-center gap-1">
      <Link
        href={link(addMonths(month, -1))}
        aria-label={t.common.prevMonth}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronLeft />
      </Link>
      <span className="min-w-36 text-center text-sm font-medium capitalize">
        {formatMonth(month, intlLocale)}
      </span>
      <Link
        href={link(addMonths(month, 1))}
        aria-label={t.common.nextMonth}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronRight />
      </Link>
    </div>
  );
}
