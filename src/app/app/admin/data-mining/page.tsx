"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { ChartCard, GroupedBarChart, SimpleBarChart } from "@/components/doctor/analytics-charts";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import {
  SEED_AGE_GENDER,
  SEED_DATA_MINING_KPIS,
  SEED_DATA_SOURCES,
  SEED_PREVALENCE_BARS,
  SEED_TREATMENT_OUTCOMES,
} from "@/design-system/admin-data";
import { cn } from "@/lib/utils";
import { Download, ShieldCheck } from "lucide-react";
import { useMemo } from "react";

export default function AdminDataMiningPage() {
  const { getPrevalence, logAdminAction } = useAdminStore();
  const livePrevalence = getPrevalence();
  const maxPerThousand = Math.max(...SEED_PREVALENCE_BARS.map((b) => b.perThousand), 1);

  const ageGenderGroups = useMemo(
    () =>
      SEED_AGE_GENDER.map((b) => ({
        label: b.band,
        values: [
          { key: "male", value: b.male, color: "#1b1b1b" },
          { key: "female", value: b.female, color: "#94a3b8" },
        ],
      })),
    [],
  );

  const outcomeBars = useMemo(
    () =>
      SEED_TREATMENT_OUTCOMES.map((m) => ({
        label: m.month,
        value: m.improved / 100,
      })),
    [],
  );

  const outcomeBaseline = useMemo(
    () =>
      SEED_TREATMENT_OUTCOMES.map((m) => ({
        label: m.month,
        value: m.readmitted / 100,
      })),
    [],
  );

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Data mining" }]}
      title="Healthcare data mining"
      meta="Population-level analytics · disease prevalence · anonymized health insights"
      actions={
        <AttioButton variant="secondary" onClick={() => logAdminAction("Exported data mining report")}>
          <Download className="size-3.5" />
          Export report
        </AttioButton>
      }
    >
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        <div className="text-[13px] text-emerald-900">
          <p className="font-medium">Data anonymization active</p>
          <p className="mt-0.5 text-emerald-800">
            Patient identifiers are stripped before aggregation. Compliant with DISHA and HIPAA-style privacy controls · k-anonymity ≥ 5.
          </p>
        </div>
      </div>

      <MetricStrip metrics={SEED_DATA_MINING_KPIS} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Disease prevalence" subtitle="Per 1,000 patients · anonymized cohort">
          <ul className="space-y-3">
            {SEED_PREVALENCE_BARS.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate text-[var(--attio-text-secondary)]">{row.label}</span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <span className="font-medium text-[var(--attio-text)]">{row.perThousand}</span>
                    <span
                      className={cn(
                        "text-[11px]",
                        row.trend.startsWith("+") ? "text-red-600" : row.trend.startsWith("−") || row.trend.startsWith("-") ? "text-emerald-600" : "text-[var(--attio-text-tertiary)]",
                      )}
                    >
                      {row.trend}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--attio-surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--attio-text)]"
                    style={{ width: `${(row.perThousand / maxPerThousand) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Patient age & gender distribution" subtitle="Anonymized population breakdown">
          <GroupedBarChart
            groups={ageGenderGroups}
            legend={[
              { key: "male", label: "Male", color: "#1b1b1b" },
              { key: "female", label: "Female", color: "#94a3b8" },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Treatment outcomes trend" subtitle="Improved vs readmission · last 8 months">
          <SimpleBarChart bars={outcomeBars} baseline={outcomeBaseline} />
          <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">
            Dark bars = improved outcomes · Grey = 30-day readmissions
          </p>
        </ChartCard>

        <Panel title="Live clinical prevalence">
          <p className="mb-3 text-[12px] text-[var(--attio-text-tertiary)]">
            From active consult records in this workspace ({livePrevalence.length} diagnoses tracked)
          </p>
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {livePrevalence.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No live consult data yet</li>
            ) : (
              livePrevalence.map((d) => (
                <li key={d.diagnosis} className="flex items-center justify-between py-3 text-[13px]">
                  <span>{d.diagnosis}</span>
                  <span className="tabular-nums text-[var(--attio-text-secondary)]">
                    {d.count} · {d.percent}% · {d.ageBand}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <Panel title="Data infrastructure" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-[var(--attio-border)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--attio-border)] bg-[var(--attio-surface)]">
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--attio-text-tertiary)]">Source</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--attio-text-tertiary)]">Records</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--attio-text-tertiary)]">Last updated</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--attio-text-tertiary)]">Status</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--attio-text-tertiary)]" />
              </tr>
            </thead>
            <tbody>
              {SEED_DATA_SOURCES.map((ds) => (
                <tr key={ds.id} className="border-b border-[var(--attio-border-subtle)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">{ds.label}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--attio-text-secondary)]">
                    {ds.records.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--attio-text-tertiary)]">{ds.lastUpdated}</td>
                  <td className="px-3 py-2.5">
                    {ds.anonymized ? (
                      <StatusBadge label="Anonymized" variant="success" />
                    ) : (
                      <StatusBadge label="Raw" variant="warning" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <AttioButton variant="ghost" className="h-7 px-2" onClick={() => logAdminAction(`Downloaded ${ds.label}`)}>
                      <Download className="size-3.5" />
                    </AttioButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageChrome>
  );
}
