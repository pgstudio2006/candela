"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { COUNSELLOR_BRANCHES } from "@/design-system/counsellor-data";

export default function CounsellorSettingsPage() {
  const { discountPolicy, seniorMode, setSeniorMode, activeBranchId, setActiveBranch } = useCounsellorStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Settings" }]} title="Desk settings" meta="Discount authority · branch · role mode">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Discount authority">
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Counsellor max</dt><dd>{discountPolicy.counsellorMaxPercent}%</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Senior counsellor max</dt><dd>{discountPolicy.seniorMaxPercent}%</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Manager approval above</dt><dd>{discountPolicy.managerApprovalAbove}%</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Reason required above</dt><dd>{discountPolicy.requireReasonAbove}%</dd></div>
          </dl>
          <label className="mt-4 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={seniorMode} onChange={(e) => setSeniorMode(e.target.checked)} />
            Senior counsellor mode ({discountPolicy.seniorMaxPercent}% limit)
          </label>
        </Panel>
        <Panel title="Branch">
          <div className="space-y-2">
            {COUNSELLOR_BRANCHES.map((b) => (
              <button key={b.id} type="button" onClick={() => setActiveBranch(b.id)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] ${activeBranchId === b.id ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/5" : "border-[var(--attio-border)]"}`}>
                {b.label}
                {activeBranchId === b.id && <StatusBadge label="Active" variant="success" />}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Compliance" className="lg:col-span-2">
          <p className="text-[13px] text-[var(--attio-text-secondary)]">Counsellors receive the full doctor handoff with no hidden clinical or commercial fields. Package consent must be captured before send-to-reception. Over-limit discounts require manager approval on the Approvals screen.</p>
        </Panel>
      </div>
    </PageChrome>
  );
}
