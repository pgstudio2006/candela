"use client";

import {
  ChartCard,
  DonutChart,
  GroupedBarChart,
  HorizontalBarList,
  SimpleBarChart,
} from "@/components/doctor/analytics-charts";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";
import { useMemo, useState } from "react";

export default function DoctorAnalyticsPage() {
  const [tab, setTab] = useState("visuals");
  const { getAnalytics, getChartAnalytics, getDashboardKpis, counsellorQueue } = useDoctorStore();
  const analytics = getAnalytics();
  const charts = getChartAnalytics();
  const kpis = getDashboardKpis();

  const performanceMetrics = useMemo(
    () => [
      { label: "Consults today", value: String(analytics.consultsToday), delta: "Completed", trend: "up" as const },
      { label: "Avg duration", value: `${analytics.avgMinutes}m`, delta: "Target 15m", trend: "neutral" as const },
      { label: "Counsellor rate", value: `${analytics.counsellorRate}%`, delta: "Handoff rate", trend: "neutral" as const },
      { label: "Counsellor queue", value: String(counsellorQueue.length), delta: "Pending counsel", trend: "neutral" as const },
    ],
    [analytics, counsellorQueue],
  );

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "Analytics" },
      ]}
      title="Consultant analytics"
      meta="Clinical visuals · session metrics · patient mix"
      tabs={[
        { id: "visuals", label: "Visuals" },
        { id: "performance", label: "Performance" },
        { id: "clinical", label: "Lists" },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "visuals" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Diagnosis mix" subtitle="Current admission categories">
              <DonutChart segments={charts.diagnosisMix} />
            </ChartCard>

            <ChartCard title="Daily consultation pattern" subtitle="Current week vs baseline average">
              <SimpleBarChart bars={charts.dailyConsultations} baseline={charts.dailyBaseline} />
              <div className="mt-3 flex gap-4 text-[11px] text-[var(--attio-text-tertiary)]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[var(--attio-text)]" />
                  This week
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[var(--attio-border)]" />
                  Baseline
                </span>
              </div>
            </ChartCard>

            <ChartCard title="Age and gender distribution" subtitle="Assigned patient demographics">
              <GroupedBarChart
                groups={charts.ageGender}
                legend={[
                  { key: "M", label: "Male", color: "#1b1b1b" },
                  { key: "F", label: "Female", color: "#8a8a88" },
                ]}
              />
            </ChartCard>

            <ChartCard title="Top ordered procedures" subtitle="Labs and imaging requests">
              <HorizontalBarList bars={charts.topProcedures} />
            </ChartCard>
          </div>

          <ChartCard title="Patient volume" subtitle="Monthly OPD vs IPD trend">
            <GroupedBarChart
              groups={charts.patientVolume}
              legend={[
                { key: "OPD", label: "OPD", color: "#1b1b1b" },
                { key: "IPD", label: "IPD", color: "#8a8a88" },
              ]}
            />
          </ChartCard>
        </div>
      )}

      {tab === "performance" && (
        <>
          <MetricStrip metrics={performanceMetrics} />
          <Panel title="Session KPIs" className="mt-4">
            <MetricStrip metrics={kpis.slice(0, 4)} className="mb-0" />
          </Panel>
        </>
      )}

      {tab === "clinical" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Top diagnoses">
            <ul className="space-y-2">
              {analytics.topDiagnoses.length === 0 && (
                <li className="py-4 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                  Complete consults to see diagnosis mix
                </li>
              )}
              {analytics.topDiagnoses.map((d) => (
                <li key={d.label} className="flex items-center justify-between text-[13px]">
                  <span className="truncate pr-4">{d.label}</span>
                  <span className="font-semibold tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Template usage">
            <ul className="space-y-2">
              {analytics.templateUsage.length === 0 && (
                <li className="py-4 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                  No templates applied yet
                </li>
              )}
              {analytics.templateUsage.map((t) => (
                <li key={t.label} className="flex items-center justify-between text-[13px]">
                  <span className="truncate pr-4">{t.label}</span>
                  <span className="font-semibold tabular-nums">{t.count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </PageChrome>
  );
}
