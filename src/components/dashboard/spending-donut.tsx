"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { formatEUR } from "@/lib/money";

export type DonutSlice = {
  key: string;
  name: string;
  cents: number;
  color: string;
  /** Link to the filtered transaction list. */
  href?: string;
};

/** Spending by category: donut + legend table (amount and share), so it never relies on colour alone. */
export function SpendingDonut({ slices }: { slices: DonutSlice[] }) {
  const { t } = useI18n();
  const total = slices.reduce((s, x) => s + x.cents, 0);
  const pct = (cents: number) => (total ? Math.round((cents / total) * 100) : 0);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto size-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatEUR(Number(value)), ""]}
              separator=""
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--popover-foreground)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t.dashboard.expenses}</span>
          <span className="text-sm font-semibold tabular-nums">{formatEUR(total)}</span>
        </div>
      </div>

      <ul className="grid gap-1.5 text-sm">
        {slices.map((s) => {
          const row = (
            <>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="tabular-nums text-muted-foreground">{pct(s.cents)}%</span>
              <span className="w-24 text-right font-medium tabular-nums">{formatEUR(s.cents)}</span>
            </>
          );
          return (
            <li key={s.key}>
              {s.href ? (
                <Link href={s.href} className="-mx-2 flex items-center gap-2 rounded-md px-2 py-0.5 hover:bg-muted">
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-2 py-0.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
