"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";

export default function CounsellorSettingsPage() {
  useCounsellorPoll();
  const { discountPolicy, seniorMode, setSeniorMode, activeBranchId, activeCounsellorName } = useCounsellorStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Settings" }]} title="Desk settings" meta="Discount authority · signed-in operator">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signed-in operator">
          <p className="text-[14px] font-medium">{activeCounsellorName}</p>
          <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">Branch: {activeBranchId.replace("branch_", "").replace("_", " ")}</p>
          <p className="mt-3 text-[12px] text-[var(--attio-text-secondary)]">Branch follows your login session — switch branch from the workspace picker at sign-in.</p>
        </Panel>
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
        <Panel title="Compliance" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label="Full doctor handoff" variant="success" />
            <StatusBadge label="Consent gate" variant="info" />
            <StatusBadge label="Audit logged" variant="neutral" />
          </div>
          <p className="mt-3 text-[13px] text-[var(--attio-text-secondary)]">Package consent is required before billing handoff. Over-limit discounts require manager approval. All conversions are written to the platform audit log.</p>
        </Panel>
      </div>
    </PageChrome>
  );
}
