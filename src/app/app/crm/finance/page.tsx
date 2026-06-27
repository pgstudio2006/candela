"use client";

import { getAllCommissionsAction, updateCommissionStatusAction } from "@/server/crm/online-counsellor-actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { CrmCommission } from "@/design-system/crm-data";
import { useEffect, useState, useMemo } from "react";
import { IndianRupee } from "lucide-react";

export default function CrmFinancePage() {
  const [commissions, setCommissions] = useState<CrmCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await getAllCommissionsAction();
    if (result.ok) setCommissions(result.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const total = commissions.reduce((s, c) => s + c.commissionAmount, 0);
    const pending = commissions.filter((c) => c.status === "pending");
    const approved = commissions.filter((c) => c.status === "approved");
    const paid = commissions.filter((c) => c.status === "paid");
    const pendingAmount = pending.reduce((s, c) => s + c.commissionAmount, 0);
    const paidAmount = paid.reduce((s, c) => s + c.commissionAmount, 0);
    return {
      total,
      pendingCount: pending.length,
      pendingAmount,
      approvedCount: approved.length,
      paidCount: paid.length,
      paidAmount,
    };
  }, [commissions]);

  const handleStatusChange = async (id: string, status: "pending" | "approved" | "paid") => {
    const result = await updateCommissionStatusAction(id, status);
    if (result.ok) void load();
  };

  const counsellorStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; paid: number }>();
    for (const c of commissions) {
      const existing = map.get(c.counsellorId) ?? { name: c.counsellorName, total: 0, count: 0, paid: 0 };
      existing.total += c.commissionAmount;
      existing.count += 1;
      if (c.status === "paid") existing.paid += c.commissionAmount;
      map.set(c.counsellorId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [commissions]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Finance" }]}
      title="Commission tracking"
      meta="Counsellor commissions on patient bills · approve & mark paid"
    >
      <MetricStrip
        metrics={[
          { label: "Total commission", value: `₹${stats.total.toLocaleString("en-IN")}`, delta: `${commissions.length} records`, trend: "up" },
          { label: "Pending", value: `₹${stats.pendingAmount.toLocaleString("en-IN")}`, delta: `${stats.pendingCount} awaiting`, trend: stats.pendingCount ? "down" : "neutral" },
          { label: "Approved", value: String(stats.approvedCount), delta: "Ready to pay", trend: "neutral" },
          { label: "Paid", value: `₹${stats.paidAmount.toLocaleString("en-IN")}`, delta: `${stats.paidCount} settled`, trend: "up" },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <Panel title="Commission records">
          {loading ? (
            <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">Loading…</p>
          ) : commissions.length === 0 ? (
            <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No commission records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--attio-border-subtle)] text-left text-[var(--attio-text-tertiary)]">
                    <th className="py-2 pr-3 font-medium">Counsellor</th>
                    <th className="py-2 pr-3 font-medium">Patient</th>
                    <th className="py-2 pr-3 text-right font-medium">Bill</th>
                    <th className="py-2 pr-3 text-right font-medium">%</th>
                    <th className="py-2 pr-3 text-right font-medium">Commission</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--attio-border-subtle)]">
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3 font-medium">{c.counsellorName}</td>
                      <td className="py-2 pr-3 text-[var(--attio-text-secondary)]">{c.patientName ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">₹{c.billAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.commissionPercent}%</td>
                      <td className="py-2 pr-3 text-right font-semibold tabular-nums">₹{c.commissionAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge
                          label={c.status}
                          variant={c.status === "paid" ? "success" : c.status === "approved" ? "info" : "warning"}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          {c.status === "pending" && (
                            <button
                              onClick={() => void handleStatusChange(c.id, "approved")}
                              className="rounded px-2 py-0.5 text-[11px] text-[var(--attio-accent)] hover:bg-[var(--attio-hover)]"
                            >
                              Approve
                            </button>
                          )}
                          {c.status === "approved" && (
                            <button
                              onClick={() => void handleStatusChange(c.id, "paid")}
                              className="rounded px-2 py-0.5 text-[11px] text-emerald-600 hover:bg-emerald-50"
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="By counsellor">
          {counsellorStats.length === 0 ? (
            <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {counsellorStats.map((cs) => (
                <li key={cs.name} className="rounded-lg border border-[var(--attio-border-subtle)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium">{cs.name}</p>
                    <IndianRupee className="size-3.5 text-[var(--attio-text-tertiary)]" />
                  </div>
                  <p className="mt-1 text-[18px] font-semibold tabular-nums text-[var(--attio-accent)]">
                    ₹{cs.total.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--attio-text-tertiary)]">
                    <span>{cs.count} commissions</span>
                    <span>Paid: ₹{cs.paid.toLocaleString("en-IN")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageChrome>
  );
}
