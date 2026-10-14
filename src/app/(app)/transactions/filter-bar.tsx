"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { addMonths, currentMonth, monthEnd, monthStart } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { NO_CATEGORY, TX_CLASSES, activeFilterCount, filtersToQuery, type TxFilters } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { CATEGORY_KINDS } from "@/lib/validation";
import type { Account, Category } from "@/lib/data";

type Preset = "all" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "custom";

function presetRange(preset: Preset): { from: string; to: string } {
  const month = currentMonth();
  const year = Number(month.slice(0, 4));
  switch (preset) {
    case "thisMonth":
      return { from: monthStart(month), to: monthEnd(month) };
    case "lastMonth": {
      const last = addMonths(month, -1);
      return { from: monthStart(last), to: monthEnd(last) };
    }
    case "thisYear":
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case "lastYear":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return { from: "", to: "" };
  }
}

function detectPreset(from: string, to: string): Preset {
  if (!from && !to) return "all";
  for (const p of ["thisMonth", "lastMonth", "thisYear", "lastYear"] as const) {
    const r = presetRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

type FilterBarProps = { filters: TxFilters; categories: Category[]; accounts: Account[] };

export function FilterBar({ filters, categories, accounts }: FilterBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const [lastSentQ, setLastSentQ] = useState(filters.q);
  const [customPeriod, setCustomPeriod] = useState(detectPreset(filters.from, filters.to) === "custom");
  const [open, setOpen] = useState(false);

  // Sync with URL changes made elsewhere (e.g. an "All from REWE" link),
  // without overwriting what the user is typing.
  const [seen, setSeen] = useState({ q: filters.q, range: `${filters.from}|${filters.to}` });
  const range = `${filters.from}|${filters.to}`;
  if (seen.q !== filters.q || seen.range !== range) {
    setSeen({ q: filters.q, range });
    if (filters.q !== lastSentQ) {
      setQ(filters.q);
      setLastSentQ(filters.q);
    }
    if (detectPreset(filters.from, filters.to) !== "custom") setCustomPeriod(false);
  }

  const count = activeFilterCount(filters);
  const preset = customPeriod ? "custom" : detectPreset(filters.from, filters.to);

  // Any filter change resets to page 1.
  function apply(patch: Partial<TxFilters>) {
    router.replace(`${pathname}${filtersToQuery({ ...filters, ...patch, page: 1 })}`, { scroll: false });
  }

  // Debounced search.
  useEffect(() => {
    if (q.trim() === filters.q) return;
    const id = setTimeout(() => {
      setLastSentQ(q.trim());
      router.replace(`${pathname}${filtersToQuery({ ...filters, q: q.trim(), page: 1 })}`, { scroll: false });
    }, 350);
    return () => clearTimeout(id);
  }, [q, filters, pathname, router]);

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.filters.search}
            aria-label={t.filters.search}
            className="h-9 pl-8"
          />
        </div>
        <Button
          variant="outline"
          className="h-9 md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal />
          {t.filters.filters}
          {count > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{count}</span>}
        </Button>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2 md:grid md:grid-cols-4", !open && "hidden")}>
        <div className="grid gap-1.5">
          <Label htmlFor="f-period">{t.filters.period}</Label>
          <NativeSelect
            id="f-period"
            value={preset}
            className="w-full"
            onChange={(e) => {
              const next = e.target.value as Preset;
              setCustomPeriod(next === "custom");
              if (next !== "custom") apply(presetRange(next));
            }}
          >
            {(["all", "thisMonth", "lastMonth", "thisYear", "lastYear", "custom"] as const).map((p) => (
              <NativeSelectOption key={p} value={p}>
                {t.filters.periods[p]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="f-category">{t.filters.category}</Label>
          <NativeSelect
            id="f-category"
            value={filters.category}
            className="w-full"
            onChange={(e) => apply({ category: e.target.value })}
          >
            <NativeSelectOption value="">{t.filters.allCategories}</NativeSelectOption>
            <NativeSelectOption value={NO_CATEGORY}>{t.dashboard.uncategorized}</NativeSelectOption>
            {CATEGORY_KINDS.map((kind) => (
              <NativeSelectOptGroup key={kind} label={t.categories.kinds[kind]}>
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="f-type">{t.filters.type}</Label>
          <NativeSelect
            id="f-type"
            value={filters.type}
            className="w-full"
            onChange={(e) => apply({ type: e.target.value as TxFilters["type"] })}
          >
            <NativeSelectOption value="">{t.filters.allTypes}</NativeSelectOption>
            {TX_CLASSES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {t.txTypes[c]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {accounts.length > 1 && (
          <div className="grid gap-1.5">
            <Label htmlFor="f-account">{t.filters.account}</Label>
            <NativeSelect
              id="f-account"
              value={filters.account}
              className="w-full"
              onChange={(e) => apply({ account: e.target.value })}
            >
              <NativeSelectOption value="">{t.filters.allAccounts}</NativeSelectOption>
              {accounts.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}

        {preset === "custom" && (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="f-from">{t.filters.from}</Label>
              <Input id="f-from" type="date" value={filters.from} onChange={(e) => apply({ from: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-to">{t.filters.to}</Label>
              <Input id="f-to" type="date" value={filters.to} onChange={(e) => apply({ to: e.target.value })} />
            </div>
          </>
        )}

        {count > 0 && (
          <div className="flex items-end">
            <Link
              href={pathname}
              onClick={() => {
                setQ("");
                setLastSentQ("");
                setCustomPeriod(false);
              }}
              className={buttonVariants({ variant: "ghost", className: "h-8" })}
            >
              <X />
              {t.filters.reset}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
