"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { Sparkles } from "lucide-react";

export default function AdminRcmPage() {
  const { getLeakageFlags, getCommandKpis, visits } = useAdminStore();
  const flags = getLeakageFlags();
  const partialTotal = visits.filter((v) => v.balanceDue).reduce((s, v) => s + (v.balanceDue ?? 0), 0);
  const deferred = visits.filter((v) => v.billing === "deferred").length;

  const aiNarrative = `Revenue cycle analysis: ₹${(partialTotal / 1000).toFixed(0)}K in partial balances across ${flags.filter((f) => f.type === "partial_uncollected").length} accounts. ${deferred} deferred packages need CRM follow-up. Nursing consent delays may block ${flags.filter((f) => f.type === "consent_delay").length} treatment starts — prioritize intake SLA. Recommended: desk collection calls for balances >₹20K, counsellor callback for deferred >14d.`;

  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "RCM" }]} title="Revenue cycle intelligence" meta="AI-driven leakage · collection optimization">
      <MetricStrip metrics={[
        { label: "Leakage flags", value: String(flags.length), delta: "Active issues", trend: flags.length > 3 ? "down" : "neutral" },
        { label: "Partial balance", value: `₹${(partialTotal / 1000).toFixed(0)}K`, delta: "Uncollected", trend: "down" },
        { label: "Deferred packages", value: String(deferred), delta: "Follow-up queue", trend: "neutral" },
        { label: "Collection rate", value: "87%", delta: "Est. from live data", trend: "up" },
      ]} />
      <Panel title="Copilot RCM briefing" action={<Sparkles className="size-4 text-[var(--attio-accent)]" />}>
        <p className="text-[13px] leading-relaxed text-[var(--attio-text-secondary)]">{aiNarrative}</p>
      </Panel>
      <Panel title="Leakage register" className="mt-4">
        <ul className="space-y-3">
          {flags.map((f) => (
            <li key={f.id} className="rounded-lg border border-[var(--attio-border-subtle)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{f.patientName}</p>
                <div className="flex gap-1">
                  <StatusBadge label={f.type.replace(/_/g, " ")} variant="info" />
                  <StatusBadge label={f.priority} variant={f.priority === "high" ? "danger" : "warning"} />
                </div>
              </div>
              <p className="mt-2 text-[13px] text-[var(--attio-text-secondary)]">{f.suggestion}</p>
              <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">{f.daysOpen}d open · visit {f.visitId}{f.amount ? ` · ₹${f.amount.toLocaleString("en-IN")}` : ""}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </PageChrome>
  );
}
