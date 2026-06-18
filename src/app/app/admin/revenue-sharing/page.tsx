"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useState } from "react";

export default function AdminRevenueSharingPage() {
  const { revenuePolicies, simulateShare, updateRevenuePolicy, departments } = useAdminStore();
  const [selected, setSelected] = useState(revenuePolicies[0]?.id ?? "");

  const policy = revenuePolicies.find((p) => p.id === selected);
  const sim = policy ? simulateShare(policy.id) : null;
  const dept = departments.find((d) => d.id === policy?.departmentId);

  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Revenue sharing" }]} title="Doctor revenue sharing" meta="Custom policies · department scope · settlement simulator">
      <div className="mb-4 flex flex-wrap gap-2">
        {revenuePolicies.map((p) => (
          <button key={p.id} type="button" onClick={() => setSelected(p.id)} className={`rounded-lg border px-3 py-2 text-[12px] ${selected === p.id ? "border-[var(--attio-accent)] bg-blue-50/50" : "border-[var(--attio-border)]"}`}>
            {p.label}
          </button>
        ))}
      </div>
      {policy && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Policy editor">
            <div className="space-y-3 text-[13px]">
              <label className="block">OPD consult %<input type="number" value={policy.opdConsultPercent} onChange={(e) => updateRevenuePolicy(policy.id, { opdConsultPercent: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-3" /></label>
              <label className="block">Package net %<input type="number" value={policy.packageNetPercent} onChange={(e) => updateRevenuePolicy(policy.id, { packageNetPercent: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-3" /></label>
              <label className="block">IPD day fixed (₹)<input type="number" value={policy.ipdDayFixed} onChange={(e) => updateRevenuePolicy(policy.id, { ipdDayFixed: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-3" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={policy.appliesToPartial} onChange={(e) => updateRevenuePolicy(policy.id, { appliesToPartial: e.target.checked })} /> Apply to partial collections</label>
              <StatusBadge label={policy.active ? "Active" : "Inactive"} variant={policy.active ? "success" : "neutral"} />
            </div>
          </Panel>
          <Panel title="Settlement simulator">
            {sim && (
              <div className="space-y-3">
                <p className="text-[15px] font-semibold">{sim.doctorName}</p>
                <p className="text-[13px] text-[var(--attio-text-tertiary)]">{dept?.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[var(--attio-surface)] p-3"><p className="text-[11px] text-[var(--attio-text-tertiary)]">Packages closed</p><p className="text-xl font-semibold">{sim.packagesClosed}</p></div>
                  <div className="rounded-lg bg-[var(--attio-surface)] p-3"><p className="text-[11px] text-[var(--attio-text-tertiary)]">Gross collected</p><p className="text-xl font-semibold tabular-nums">₹{sim.gross.toLocaleString("en-IN")}</p></div>
                </div>
                <p className="text-[22px] font-semibold tabular-nums text-[var(--attio-accent)]">Share: ₹{sim.share.toLocaleString("en-IN")}</p>
                <AttioButton variant="primary">Export for payroll</AttioButton>
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageChrome>
  );
}
