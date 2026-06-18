"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { ChartCard, DonutChart, HorizontalBarList } from "@/components/doctor/analytics-charts";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";
import { useMemo, useState } from "react";

export default function CounsellorAnalyticsPage() {
  const [tab, setTab] = useState("performance");
  const { getAnalytics, getDashboardKpis } = useCounsellorStore();
  const a = getAnalytics();
  const kpis = getDashboardKpis();

  const outcomeSegments = useMemo(
    () => a.outcomes.map((o, i) => ({
      label: o.label,
      value: o.count,
      color: ["#1b1b1b", "#5c5c5a", "#8a8a88", "#4263eb"][i % 4],
    })),
    [a.outcomes],
  );

  const packageBars = useMemo(
    () => a.packageMix.map((p) => ({ label: p.label, value: p.count / Math.max(...a.packageMix.map((x) => x.count), 1) })),
    [a.packageMix],
  );

  const lostBars = useMemo(
    () => a.lostReasons.map((r) => ({ label: r.label, value: r.count / Math.max(...a.lostReasons.map((x) => x.count), 1) })),
    [a.lostReasons],
  );

  const perfMetrics = useMemo(
    () => [
      { label: "Conversion rate", value: `${a.conversionRate}%`, delta: "Handoff → closed", trend: "up" as const },
      { label: "Avg discount", value: `${a.avgDiscount}%`, delta: "Applied", trend: "neutral" as const },
      { label: "Avg close time", value: `${a.avgCloseMin}m`, delta: "Per session", trend: "neutral" as const },
      { label: "Pipeline", value: `₹${(a.pipelineValue / 1000).toFixed(0)}K`, delta: "In queue", trend: "neutral" as const },
    ],
    [a],
  );

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Analytics" }]}
      title="Conversion analytics"
      meta="Outcomes · package mix · lost reasons"
      tabs={[{ id: "performance", label: "Performance" }, { id: "visuals", label: "Visuals" }]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "performance" && (
        <>
          <MetricStrip metrics={perfMetrics} />
          <Panel title="Desk KPIs" className="mt-4"><MetricStrip metrics={kpis.slice(0, 4)} className="mb-0" /></Panel>
        </>
      )}
      {tab === "visuals" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Session outcomes" subtitle="Converted · deferred · lost · callback">
            <DonutChart segments={outcomeSegments.length ? outcomeSegments : [{ label: "No data", value: 1, color: "#e5e5e3" }]} />
          </ChartCard>
          <ChartCard title="Package mix" subtitle="Sold packages">
            <HorizontalBarList bars={packageBars.length ? packageBars : []} />
          </ChartCard>
          <ChartCard title="Lost & deferred reasons" subtitle="Objection tags" className="lg:col-span-2">
            <HorizontalBarList bars={lostBars.length ? lostBars : []} />
          </ChartCard>
        </div>
      )}
    </PageChrome>
  );
}
