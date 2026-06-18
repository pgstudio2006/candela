"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { ChartCard, DonutChart, HorizontalBarList } from "@/components/doctor/analytics-charts";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";
import { useMemo } from "react";

export default function NurseAnalyticsPage() {
  const { getAnalytics, getDashboardKpis } = useNurseStore();
  const a = getAnalytics();
  const kpis = getDashboardKpis();

  const pathSegments = useMemo(
    () =>
      a.byPath.map((p, i) => ({
        label: p.label,
        value: p.count,
        color: ["#4263eb", "#1b1b1b", "#10b981"][i % 3],
      })),
    [a.byPath],
  );

  const captureBars = useMemo(
    () => [
      { label: "Canvas sign", value: a.uploadVsSign.sign / Math.max(a.uploadVsSign.sign + a.uploadVsSign.upload, 1) },
      { label: "Upload scan", value: a.uploadVsSign.upload / Math.max(a.uploadVsSign.sign + a.uploadVsSign.upload, 1) },
    ],
    [a.uploadVsSign],
  );

  const perfMetrics = useMemo(
    () => [
      { label: "Consent completion", value: `${a.consentRate}%`, delta: "Required forms verified", trend: "up" as const },
      { label: "Avg intake time", value: `${a.avgIntakeMin}m`, delta: "Queue → session 1", trend: "neutral" as const },
      { label: "Sessions today", value: String(a.sessionsToday), delta: "Completed", trend: "up" as const },
      { label: "Queue depth", value: kpis[0]?.value ?? "0", delta: "Execution queue", trend: "neutral" as const },
    ],
    [a, kpis],
  );

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Analytics" }]}
      title="Nursing analytics"
      meta="Consent gates · intake SLA · treatment path mix"
    >
      <MetricStrip metrics={perfMetrics} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Care path mix" subtitle="OPD · IPD · Daycare">
          <DonutChart segments={pathSegments} />
        </ChartCard>
        <ChartCard title="Consent capture mode" subtitle="E-sign vs upload">
          <HorizontalBarList bars={captureBars} />
        </ChartCard>
      </div>
      <Panel title="Operational notes" className="mt-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">
          Consent verification is the primary bottleneck. Target &lt;15 min intake for OPD packages. IPD admission bundles require witness co-sign.
        </p>
      </Panel>
    </PageChrome>
  );
}
