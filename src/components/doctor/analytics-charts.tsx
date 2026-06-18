"use client";

import type { ChartBar, ChartSegment, GroupedChartBar } from "@/lib/doctor-analytics-data";
import { diagnosisPercent } from "@/lib/doctor-analytics-data";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-[var(--attio-border)] bg-white", className)}>
      <div className="border-b border-[var(--attio-border-subtle)] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--attio-text)]">{title}</h3>
        <p className="mt-0.5 text-[12px] text-[var(--attio-text-tertiary)]">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ChartGrid({ ticks = 4 }: { ticks?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      {Array.from({ length: ticks + 1 }).map((_, i) => (
        <div
          key={i}
          className="border-t border-dashed border-[var(--attio-border-subtle)]"
          style={{ opacity: i === 0 ? 0 : 1 }}
        />
      ))}
    </div>
  );
}

function YAxisLabels({ ticks = 4 }: { ticks?: number }) {
  return (
    <div className="flex h-[180px] flex-col justify-between pr-2 text-[10px] tabular-nums text-[var(--attio-text-tertiary)]">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = (ticks - i) / ticks;
        return (
          <span key={i}>
            {v === 0 ? "0" : v === 1 ? "1" : v.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}

export function DonutChart({ segments }: { segments: ChartSegment[] }) {
  const withPct = diagnosisPercent(segments);
  const total = segments.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--attio-text-tertiary)]">
        No diagnosis data yet
      </p>
    );
  }

  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="relative size-[148px] shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--attio-border-subtle)" strokeWidth="14" />
          {withPct.map((seg) => {
            const len = (seg.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={seg.color ?? "#1b1b1b"}
                strokeWidth="14"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-semibold tabular-nums text-[var(--attio-text)]">{total}</span>
          <span className="text-[10px] text-[var(--attio-text-tertiary)]">cases</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {withPct.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: seg.color ?? "#1b1b1b" }}
              />
              <span className="truncate text-[var(--attio-text-secondary)]">{seg.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-[var(--attio-text)]">{seg.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SimpleBarChart({
  bars,
  baseline,
}: {
  bars: ChartBar[];
  baseline?: ChartBar[];
}) {
  const max = Math.max(...bars.map((b) => b.value), ...(baseline?.map((b) => b.value) ?? []), 0.01);

  return (
    <div className="flex gap-2">
      <YAxisLabels />
      <div className="relative min-w-0 flex-1">
        <ChartGrid />
        <div className="relative flex h-[180px] items-end justify-between gap-1 px-1">
          {bars.map((bar, i) => {
            const h = (bar.value / max) * 100;
            const baseH = baseline ? (baseline[i].value / max) * 100 : 0;
            return (
              <div key={bar.label} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                <div className="relative flex w-full max-w-[36px] flex-1 items-end justify-center gap-0.5">
                  {baseline && (
                    <div
                      className="w-[42%] rounded-t-sm bg-[var(--attio-border)]"
                      style={{ height: `${baseH}%`, minHeight: baseH > 0 ? 2 : 0 }}
                      title="Baseline"
                    />
                  )}
                  <div
                    className={cn(
                      "rounded-t-sm bg-[var(--attio-text)]",
                      baseline ? "w-[42%]" : "w-full max-w-[28px]",
                    )}
                    style={{ height: `${h}%`, minHeight: h > 0 ? 4 : 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-1 px-1">
          {bars.map((bar) => (
            <span
              key={bar.label}
              className="flex-1 text-center text-[10px] text-[var(--attio-text-tertiary)]"
            >
              {bar.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GroupedBarChart({
  groups,
  legend,
}: {
  groups: GroupedChartBar[];
  legend?: { key: string; label: string; color: string }[];
}) {
  const max = Math.max(
    ...groups.flatMap((g) => g.values.map((v) => v.value)),
    0.01,
  );

  return (
    <div>
      {legend && (
        <div className="mb-3 flex flex-wrap gap-3">
          {legend.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-[var(--attio-text-secondary)]">
              <span className="size-2 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <YAxisLabels />
        <div className="relative min-w-0 flex-1">
          <ChartGrid />
          <div className="relative flex h-[180px] items-end justify-between gap-2 px-1">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-1 flex-col items-center justify-end">
                <div className="flex h-full w-full max-w-[48px] items-end justify-center gap-1">
                  {group.values.map((v) => (
                    <div
                      key={v.key}
                      className="w-[46%] rounded-t-sm"
                      style={{
                        height: `${(v.value / max) * 100}%`,
                        minHeight: v.value > 0 ? 4 : 0,
                        background: v.color ?? "#1b1b1b",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-1 px-1">
            {groups.map((g) => (
              <span
                key={g.label}
                className="flex-1 text-center text-[10px] text-[var(--attio-text-tertiary)]"
              >
                {g.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HorizontalBarList({ bars }: { bars: ChartBar[] }) {
  if (bars.length === 0 || bars.every((b) => b.value === 0)) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--attio-text-tertiary)]">
        No procedure activity yet
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bars.map((bar) => (
        <li key={bar.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate text-[var(--attio-text-secondary)]">{bar.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--attio-text-tertiary)]">
              {Math.round(bar.value * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--attio-surface)]">
            <div
              className="h-full rounded-full bg-[var(--attio-text)] transition-all"
              style={{ width: `${Math.max(bar.value * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
