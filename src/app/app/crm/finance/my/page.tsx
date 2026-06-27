"use client";

import { getCounsellorCommissionsAction } from "@/server/crm/online-counsellor-actions";
import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { CrmCommission } from "@/design-system/crm-data";
import { useEffect, useState, useMemo } from "react";

export default function MyFinancePage() {
  const { getOperator } = useCrmStore();
  const operator = getOperator();
  const [commissions, setCommissions] = useState<CrmCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!operator?.id) return;
    setLoading(true);
    const result = await getCounsellorCommissionsAction(operator.id);
    if (result.ok) setCommissions(result.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [operator?.id]);

  const stats = useMemo(() => {
    const total = commissions.reduce((s, c) => s + c.commissionAmount, 0);
    const paid = commissions.filter((c) => c.status === "paid");
    const pending = commissions.filter((c) => c.status === "pending");
    const paidAmount = paid.reduce((s, c) => s + c.commissionAmount, 0);
    const pendingAmount = pending.reduce((s, c) => s + c.commissionAmount, 0);
    return { total, paidAmount, pendingAmount, paidCount: paid.length, pendingCount: pending.length };
  }, [commissions]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "My finance" }]}
      title="My commissions"
      meta="Your commission on patient bills · track pending and paid"
    >
      <MetricStrip
        metrics={[
          { label: "Total earned", value: `₹${stats.total.toLocaleString("en-IN")}`, delta: `${commissions.length} records`, trend: "up" },
          { label: "Pending", value: `₹${stats.pendingAmount.toLocaleString("en-IN")}`, delta: `${stats.pendingCount} awaiting`, trend: stats.pendingCount ? "down" : "neutral" },
          { label: "Paid", value: `₹${stats.paidAmount.toLocaleString("en-IN")}`, delta: `${stats.paidCount} settled`, trend: "up" },
        ]}
      />

      <Panel title="Commission history" className="mt-4">
        {loading ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">Loading…</p>
        ) : commissions.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No commission records yet. Commissions are generated when your leads convert and their bills are settled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--attio-border-subtle)] text-left text-[var(--attio-text-tertiary)]">
                  <th className="py-2 pr-3 font-medium">Patient</th>
                  <th className="py-2 pr-3 text-right font-medium">Bill amount</th>
                  <th className="py-2 pr-3 text-right font-medium">%</th>
                  <th className="py-2 pr-3 text-right font-medium">Commission</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--attio-border-subtle)]">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 font-medium">{c.patientName ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">₹{c.billAmount.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.commissionPercent}%</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">₹{c.commissionAmount.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge
                        label={c.status}
                        variant={c.status === "paid" ? "success" : c.status === "approved" ? "info" : "warning"}
                      />
                    </td>
                    <td className="py-2 pr-3 text-[var(--attio-text-tertiary)]">
                      {new Date(c.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageChrome>
  );
}
