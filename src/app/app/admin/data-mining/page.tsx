"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { ChartCard, GroupedBarChart, SimpleBarChart } from "@/components/doctor/analytics-charts";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo } from "react";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDataMiningPage() {
  const { dataMining, getPrevalence, logAdminAction, refresh, ready } = useAdminStore();
  const livePrevalence = getPrevalence();
  const maxPerThousand = Math.max(...dataMining.prevalenceBars.map((b) => b.perThousand), 1);

  const ageGenderGroups = useMemo(
    () =>
      dataMining.ageGender.map((b) => ({
        label: b.band,
        values: [
          { key: "male", value: b.male, color: "#1b1b1b" },
          { key: "female", value: b.female, color: "#94a3b8" },
        ],
      })),
    [dataMining.ageGender],
  );

  const outcomeBars = useMemo(
    () =>
      dataMining.treatmentOutcomes.map((m) => ({
        label: m.month,
        value: m.improved / 100,
      })),
    [dataMining.treatmentOutcomes],
  );

  const outcomeBaseline = useMemo(
    () =>
      dataMining.treatmentOutcomes.map((m) => ({
        label: m.month,
        value: m.readmitted / 100,
      })),
    [dataMining.treatmentOutcomes],
  );

  const exportReport = () => {
    const lines = [
      "diagnosis,count,percent,age_band",
      ...livePrevalence.map((d) => `"${d.diagnosis}",${d.count},${d.percent},${d.ageBand}`),
    ];
    downloadText(`candela-data-mining-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    void logAdminAction("Exported data mining report");
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Data mining" }]}
      title="Healthcare data mining"
      meta="Live population analytics · disease prevalence · anonymized health insights"
      actions={
        <div className="flex gap-2">
          <AttioButton variant="secondary" onClick={() => void refresh()} disabled={!ready}>
            <RefreshCw className="size-3.5" />
            Refresh
          </AttioButton>
          <AttioButton variant="secondary" onClick={exportReport}>
            <Download className="size-3.5" />
            Export report
          </AttioButton>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        <div className="text-[13px] text-emerald-900">
          <p className="font-medium">Live anonymized aggregation</p>
          <p className="mt-0.5 text-emerald-800">
            Metrics recompute from patients, visits, and consultation diagnoses in this workspace · k-anonymity ≥ 5.
          </p>
        </div>
      </div>

      <MetricStrip metrics={dataMining.kpis} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Disease prevalence" subtitle="Per 1,000 patients · live ICD / diagnosis cohort">
          <ul className="space-y-3">
            {dataMining.prevalenceBars.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                Register patients and complete consultations to populate prevalence
              </li>
            ) : (
              dataMining.prevalenceBars.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-[var(--attio-text-secondary)]">{row.label}</span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums">
                      <span className="font-medium text-[var(--attio-text)]">{row.perThousand}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          row.trend.includes("+")
                            ? "text-red-600"
                            : row.trend.includes("−") || row.trend.includes("-")
                              ? "text-emerald-600"
                              : "text-[var(--attio-text-tertiary)]",
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
              ))
            )}
          </ul>
        </ChartCard>

        <ChartCard title="Patient age & gender distribution" subtitle="Live population breakdown">
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
        <ChartCard title="Treatment outcomes trend" subtitle="Completed vs readmission · rolling months">
          {dataMining.treatmentOutcomes.length > 0 ? (
            <>
              <SimpleBarChart bars={outcomeBars} baseline={outcomeBaseline} />
              <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">
                Dark bars = completed visits · Grey = readmission flags
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">No visit history yet</p>
          )}
        </ChartCard>

        <Panel title="Live clinical prevalence">
          <p className="mb-3 text-[12px] text-[var(--attio-text-tertiary)]">
            From consultation records ({livePrevalence.length} diagnoses tracked)
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
              </tr>
            </thead>
            <tbody>
              {dataMining.dataSources.map((ds) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageChrome>
  );
}
