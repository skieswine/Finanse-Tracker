"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/types";
import { formatEUR } from "@/lib/money";

export type TrendPoint = { month: string; income: number; expenses: number };

const compactEUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Income vs expenses per month — one axis, two thin bar series. */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const { t, locale } = useI18n();
  const monthLabel = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, 1)),
    );
  };

  return (
    <div className="grid gap-3">
      {/* Legend: two series, so identity is never colour-alone. */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-series-income" />
          {t.dashboard.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-series-expense" />
          {t.dashboard.expenses}
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => compactEUR.format(v / 100)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              labelFormatter={(label) => monthLabel(String(label))}
              formatter={(value, name) => [
                formatEUR(Number(value)),
                name === "income" ? t.dashboard.income : t.dashboard.expenses,
              ]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="income" fill="var(--series-income)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="expenses" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
