"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { ArrowLeft, TrendingUp, IndianRupee, Phone, Users, Target } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type StaffStats = {
  agentId: string;
  totalLeads: number;
  openLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  commissionCount: number;
  dailyStats: { date: string; leads: number; conversions: number; calls: number }[];
  statusCounts: Record<string, number>;
  recentCommissions: {
    id: string;
    patientName: string;
    billAmount: number;
    commissionPercent: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }[];
  recentActivities: { id: string; type: string; summary: string; at: string }[];
};

export default function CrmStaffDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { agents, isManager } = useCrmStore();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agent = agents.find((a) => a.id === id);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crm/staff/${id}`, { credentials: "include" });
        const json = await res.json();
        if (json.ok) {
          setStats(json.data);
          setError(null);
        } else {
          setError(json.error ?? "Failed to load stats.");
        }
      } catch {
        setError("Failed to connect.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Staff" }]} title="Access restricted">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Staff details are available in the manager workspace only.</p>
      </PageChrome>
    );
  }

  if (loading) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs", href: "/app/crm/analytics" }, { label: "Loading…" }]} title="Loading…">
        <Panel title="Loading staff stats…">
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">Please wait.</p>
        </Panel>
      </PageChrome>
    );
  }

  if (error || !stats) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Team KPIs", href: "/app/crm/analytics" }, { label: "Error" }]} title="Error">
        <Panel title="Error">
          <p className="text-[13px] text-red-600">{error ?? "Staff member not found."}</p>
          <Link href="/app/crm/analytics" className="mt-3 inline-block text-[12px] text-[var(--attio-accent)]">← Back to KPIs</Link>
        </Panel>
      </PageChrome>
    );
  }

  const maxDailyLeads = Math.max(...stats.dailyStats.map((d) => d.leads), 1);
  const maxDailyConversions = Math.max(...stats.dailyStats.map((d) => d.conversions), 1);
  const maxDailyCalls = Math.max(...stats.dailyStats.map((d) => d.calls), 1);

  const statusColors: Record<string, string> = {
    fresh: "bg-slate-400",
    call_picked: "bg-blue-500",
    call_not_picked: "bg-amber-500",
    lead_form_filled: "bg-indigo-500",
    wants_visit: "bg-purple-500",
    appointment_booked: "bg-cyan-500",
    visit_done: "bg-emerald-500",
    converted: "bg-emerald-600",
    lost: "bg-red-500",
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "CRM", href: "/app/crm" },
        { label: "Team KPIs", href: "/app/crm/analytics" },
        { label: agent?.name ?? "Staff" },
      ]}
      title={agent?.name ?? "Staff member"}
      meta={agent?.email ?? ""}
      actions={
        <Link href="/app/crm/analytics">
          <AttioButton variant="secondary" className="gap-1">
            <ArrowLeft className="size-3.5" />
            Back to KPIs
          </AttioButton>
        </Link>
      }
    >
      {/* Key metrics */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--attio-border-subtle)] p-4">
          <div className="flex items-center gap-2 text-[11px] text-[var(--attio-text-tertiary)]">
            <Users className="size-3.5" />
            Total leads
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{stats.totalLeads}</p>
          <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">{stats.openLeads} open · {stats.convertedLeads} converted · {stats.lostLeads} lost</p>
        </div>
        <div className="rounded-lg border border-[var(--attio-border-subtle)] p-4">
          <div className="flex items-center gap-2 text-[11px] text-[var(--attio-text-tertiary)]">
            <Target className="size-3.5" />
            Conversion rate
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{stats.conversionRate}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--attio-border-subtle)]">
            <div className="h-full rounded-full bg-[var(--attio-accent)]" style={{ width: `${stats.conversionRate}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-[var(--attio-border-subtle)] p-4">
          <div className="flex items-center gap-2 text-[11px] text-[var(--attio-text-tertiary)]">
            <IndianRupee className="size-3.5" />
            Revenue generated
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">From {stats.commissionCount} conversions</p>
        </div>
        <div className="rounded-lg border border-[var(--attio-border-subtle)] p-4">
          <div className="flex items-center gap-2 text-[11px] text-[var(--attio-text-tertiary)]">
            <TrendingUp className="size-3.5" />
            Commission earned
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">₹{stats.totalCommission.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">Paid: ₹{stats.paidCommission.toLocaleString("en-IN")} · Pending: ₹{stats.pendingCommission.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Daily leads graph (30 days) */}
      <Panel title="Daily leads — last 30 days" className="mb-4">
        <div className="flex items-end gap-1" style={{ height: "120px" }}>
          {stats.dailyStats.map((d) => (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t bg-[var(--attio-accent)] opacity-70 transition-opacity hover:opacity-100"
                style={{ height: `${(d.leads / maxDailyLeads) * 100}%`, minHeight: d.leads > 0 ? "4px" : "0" }}
                title={`${d.date}: ${d.leads} leads`}
              />
              <div className="absolute -top-6 hidden rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {d.leads}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--attio-text-tertiary)]">
          <span>{stats.dailyStats[0]?.date ?? ""}</span>
          <span>{stats.dailyStats[stats.dailyStats.length - 1]?.date ?? ""}</span>
        </div>
      </Panel>

      {/* Daily conversions & calls */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Daily conversions — last 30 days">
          <div className="flex items-end gap-1" style={{ height: "100px" }}>
            {stats.dailyStats.map((d) => (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t bg-emerald-500 opacity-70 transition-opacity hover:opacity-100"
                  style={{ height: `${(d.conversions / maxDailyConversions) * 100}%`, minHeight: d.conversions > 0 ? "4px" : "0" }}
                  title={`${d.date}: ${d.conversions} conversions`}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Daily calls — last 30 days">
          <div className="flex items-end gap-1" style={{ height: "100px" }}>
            {stats.dailyStats.map((d) => (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t bg-blue-500 opacity-70 transition-opacity hover:opacity-100"
                  style={{ height: `${(d.calls / maxDailyCalls) * 100}%`, minHeight: d.calls > 0 ? "4px" : "0" }}
                  title={`${d.date}: ${d.calls} calls`}
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Lead status distribution */}
      <Panel title="Lead status distribution" className="mb-4">
        <div className="space-y-2">
          {Object.entries(stats.statusCounts).map(([status, count]) => {
            const pct = stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-[12px] capitalize">{status.replace(/_/g, " ")}</span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded bg-[var(--attio-border-subtle)]">
                    <div
                      className={`h-full rounded ${statusColors[status] ?? "bg-slate-400"}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-[12px] tabular-nums">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Recent commissions & activities */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent commissions">
          {stats.recentCommissions.length === 0 ? (
            <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No commissions yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentCommissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] p-2 text-[12px]">
                  <div>
                    <p className="font-medium">{c.patientName || "—"}</p>
                    <p className="text-[var(--attio-text-tertiary)]">Bill ₹{c.billAmount.toLocaleString("en-IN")} · {c.commissionPercent}%</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">₹{c.commissionAmount.toLocaleString("en-IN")}</p>
                    <StatusBadge label={c.status} variant={c.status === "paid" ? "success" : c.status === "approved" ? "info" : "warning"} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activities">
          {stats.recentActivities.length === 0 ? (
            <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No activities yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentActivities.map((a) => (
                <li key={a.id} className="border-l-2 border-[var(--attio-border-subtle)] pl-3 text-[12px]">
                  <p>{a.summary}</p>
                  <p className="text-[10px] text-[var(--attio-text-tertiary)]">{new Date(a.at).toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageChrome>
  );
}
