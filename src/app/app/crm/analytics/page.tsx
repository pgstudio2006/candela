"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";

export default function CrmAnalyticsPage() {
  const { getAgentKpis, integrations, isManager } = useCrmStore();
  const kpis = getAgentKpis();
  const teamConversion = kpis.length ? Math.round(kpis.reduce((s, k) => s + k.conversionRate, 0) / kpis.length) : 0;

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs" }]} title="Team KPIs" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Team-wide KPIs are visible in the manager workspace only.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs" }]}
      title="Team KPIs"
      meta="Manager dashboard — track every counsellor & caller performance"
    >
      <MetricStrip
        metrics={[
          { label: "Team avg conversion", value: `${teamConversion}%`, delta: "Across assignees", trend: "up" },
          { label: "Total open leads", value: String(kpis.reduce((s, k) => s + k.openLeads, 0)), delta: "Pipeline load", trend: "neutral" },
          { label: "SLA breaches", value: String(kpis.reduce((s, k) => s + k.slaBreaches, 0)), delta: "New leads over SLA", trend: "down" },
          { label: "Inbound today", value: String(integrations.reduce((s, i) => s + i.leadsToday, 0)), delta: "All sources", trend: "up" },
        ]}
      />
      <Panel title="Per-person performance" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11px] text-[var(--attio-text-tertiary)]">
                <th className="py-2 pr-4">Counsellor / caller</th>
                <th className="py-2 px-2">Open</th>
                <th className="py-2 px-2">Contacted today</th>
                <th className="py-2 px-2">Won</th>
                <th className="py-2 px-2">Conv %</th>
                <th className="py-2 px-2">Avg response</th>
                <th className="py-2 px-2">Follow-ups due</th>
                <th className="py-2 px-2">Pipeline ₹</th>
                <th className="py-2 px-2">SLA breach</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.agentId} className="border-b border-[var(--attio-border-subtle)]">
                  <td className="py-2.5 pr-4 font-medium">{k.agentName}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.openLeads}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.contactedToday}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.conversions}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.conversionRate}%</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.avgResponseMin}m</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.followUpsDue}</td>
                  <td className="py-2.5 px-2 tabular-nums">₹{(k.pipelineValue / 100000).toFixed(1)}L</td>
                  <td className="py-2.5 px-2 tabular-nums text-amber-700">{k.slaBreaches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageChrome>
  );
}
