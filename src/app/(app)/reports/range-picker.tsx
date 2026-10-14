"use client";

import { useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/types";

type RangePickerProps = {
  from: string; // YYYY-MM
  to: string; // YYYY-MM
  years: number[];
};

/** "From month/year — to month/year", like banking apps. Applies on change. */
export function RangePicker({ from, to, years }: RangePickerProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2000, i, 1)),
    ),
  );

  function go(nextFrom: string, nextTo: string) {
    // Keep the range ordered even if the user picks "to" before "from".
    const [a, b] = nextFrom <= nextTo ? [nextFrom, nextTo] : [nextTo, nextFrom];
    router.push(`/reports?period=range&from=${a}&to=${b}`, { scroll: false });
  }

  const shared = { monthNames, years, monthLabel: t.reports.monthLabel, yearLabel: t.reports.yearLabel };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <MonthYear {...shared} label={t.reports.fromMonth} value={from} onChange={(v) => go(v, to)} />
      <MonthYear {...shared} label={t.reports.toMonth} value={to} onChange={(v) => go(from, v)} />
    </div>
  );
}

type MonthYearProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  monthNames: string[];
  years: number[];
  monthLabel: string;
  yearLabel: string;
};

function MonthYear({ label, value, onChange, monthNames, years, monthLabel, yearLabel }: MonthYearProps) {
  const [y, m] = value.split("-");
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="w-6 text-sm text-muted-foreground">
        {label}
      </span>
      <NativeSelect
        aria-label={`${label}: ${monthLabel}`}
        value={m}
        onChange={(e) => onChange(`${y}-${e.target.value}`)}
        className="w-36"
      >
        {monthNames.map((name, i) => {
          const mm = String(i + 1).padStart(2, "0");
          return (
            <NativeSelectOption key={mm} value={mm}>
              {name}
            </NativeSelectOption>
          );
        })}
      </NativeSelect>
      <NativeSelect
        aria-label={`${label}: ${yearLabel}`}
        value={y}
        onChange={(e) => onChange(`${e.target.value}-${m}`)}
        className="w-24"
      >
        {years.map((year) => (
          <NativeSelectOption key={year} value={String(year)}>
            {year}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </fieldset>
  );
}
