"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";
import { getAllCommissionsAction } from "@/server/crm/online-counsellor-actions";
import { Award, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CrmCommission } from "@/design-system/crm-data";

export default function CrmAnalyticsPage() {
  const { getAgentKpis, integrations, isManager } = useCrmStore();
  const kpis = getAgentKpis();
  const [commissions, setCommissions] = useState<CrmCommission[]>([]);
  const teamConversion = kpis.length ? Math.round(kpis.reduce((s, k) => s + k.conversionRate, 0) / kpis.length) : 0;

  useEffect(() => {
    void (async () => {
      const result = await getAllCommissionsAction();
      if (result.ok) setCommissions(result.data);
    })();
  }, []);

  const leaderboard = useMemo(() => {
    return kpis
      .map((k) => {
        const agentCommissions = commissions.filter((c) => c.counsellorId === k.agentId);
        const totalRevenue = agentCommissions.reduce((s, c) => s + c.billAmount, 0);
        const totalCommission = agentCommissions.reduce((s, c) => s + c.commissionAmount, 0);
        const paidCommission = agentCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0);
        return { ...k, totalRevenue, totalCommission, paidCommission, commissionCount: agentCommissions.length };
      })
      .sort((a, b) => b.conversionRate - a.conversionRate);
  }, [kpis, commissions]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs" }]} title="Team KPIs" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Team-wide KPIs are visible in the manager workspace only.</p>
      </PageChrome>
    );
  }

  const maxRevenue = Math.max(...leaderboard.map((l) => l.totalRevenue), 1);
  const maxConversion = Math.max(...leaderboard.map((l) => l.conversionRate), 1);

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs" }]}
      title="Team KPIs & Leaderboard"
      meta="Track counsellor performance — conversion, revenue, commissions"
    >
      <MetricStrip
        metrics={[
          { label: "Team avg conversion", value: `${teamConversion}%`, delta: "Across assignees", trend: "up" },
          { label: "Total open leads", value: String(kpis.reduce((s, k) => s + k.openLeads, 0)), delta: "Pipeline load", trend: "neutral" },
          { label: "SLA breaches", value: String(kpis.reduce((s, k) => s + k.slaBreaches, 0)), delta: "New leads over SLA", trend: "down" },
          { label: "Inbound today", value: String(integrations.reduce((s, i) => s + i.leadsToday, 0)), delta: "All sources", trend: "up" },
        ]}
      />

      <Panel title="Leaderboard — Conversion Ratio" className="mt-4">
        {leaderboard.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => (
              <div key={entry.agentId} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
                  {idx === 0 ? <Trophy className="size-5 text-amber-500" /> : idx === 1 ? <Award className="size-5 text-slate-400" /> : idx === 2 ? <Award className="size-5 text-amber-700" /> : <span className="text-[var(--attio-text-tertiary)]">{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Link href={`/app/crm/staff/${entry.agentId}`} className="text-[13px] font-medium hover:underline">{entry.agentName}</Link>
                    <span className="text-[13px] font-semibold tabular-nums">{entry.conversionRate}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--attio-border-subtle)]">
                    <div className="h-full rounded-full bg-[var(--attio-accent)] transition-all" style={{ width: `${(entry.conversionRate / maxConversion) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex gap-4 text-[11px] text-[var(--attio-text-tertiary)]">
                    <span>{entry.conversions} won</span>
                    <span>{entry.openLeads} open</span>
                    <span>₹{(entry.totalRevenue / 100000).toFixed(1)}L revenue</span>
                    <span>₹{entry.totalCommission.toLocaleString("en-IN")} commission</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Revenue by counsellor" className="mt-4">
        {leaderboard.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No revenue data yet.</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice().sort((a, b) => b.totalRevenue - a.totalRevenue).map((entry) => (
              <div key={entry.agentId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[12px] font-medium">{entry.agentName}</span>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded bg-[var(--attio-border-subtle)]">
                    <div className="flex h-full items-center justify-end rounded bg-emerald-500/80 px-2 text-[10px] font-medium text-white transition-all" style={{ width: `${Math.max((entry.totalRevenue / maxRevenue) * 100, 8)}%` }}>
                      ₹{(entry.totalRevenue / 100000).toFixed(1)}L
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Per-person performance" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11px] text-[var(--attio-text-tertiary)]">
                <th className="py-2 pr-4">Counsellor</th>
                <th className="py-2 px-2">Open</th>
                <th className="py-2 px-2">Contacted</th>
                <th className="py-2 px-2">Won</th>
                <th className="py-2 px-2">Conv %</th>
                <th className="py-2 px-2">Avg response</th>
                <th className="py-2 px-2">Follow-ups</th>
                <th className="py-2 px-2">Pipeline ₹</th>
                <th className="py-2 px-2">Revenue ₹</th>
                <th className="py-2 px-2">Commission ₹</th>
                <th className="py-2 px-2">SLA</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((k) => (
                <tr key={k.agentId} className="border-b border-[var(--attio-border-subtle)]">
                  <td className="py-2.5 pr-4 font-medium">{k.agentName}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.openLeads}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.contactedToday}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.conversions}</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.conversionRate}%</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.avgResponseMin}m</td>
                  <td className="py-2.5 px-2 tabular-nums">{k.followUpsDue}</td>
                  <td className="py-2.5 px-2 tabular-nums">₹{(k.pipelineValue / 100000).toFixed(1)}L</td>
                  <td className="py-2.5 px-2 tabular-nums">₹{k.totalRevenue.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 px-2 tabular-nums">₹{k.totalCommission.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 px-2 tabular-nums text-amber-700">{k.slaBreaches}</td>
                  <td className="py-2.5 px-2">
                    <Link href={`/app/crm/staff/${k.agentId}`} className="text-[11px] text-[var(--attio-accent)] hover:underline">Details →</Link>
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
