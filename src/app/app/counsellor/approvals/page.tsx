"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { formatConsultDate } from "@/lib/doctor-records";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";
import { useToast } from "@/components/ui/toast-provider";

export default function CounsellorApprovalsPage() {
  useCounsellorPoll();
  const { toast } = useToast();
  const { approvals, resolveApproval } = useCounsellorStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Approvals" }]} title="Discount approvals" meta="Manager queue · over-limit requests">
      <Panel title={`${approvals.length} pending`}>
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {approvals.length === 0 && <li className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">No pending approvals</li>}
          {approvals.map((a) => (
            <li key={a.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium">{a.patientName}</p>
                  <p className="text-[12px] text-[var(--attio-text-tertiary)]">{formatConsultDate(a.requestedAt)} · {a.requestedPercent}% discount</p>
                  <p className="mt-2 text-[13px]">{a.reason}</p>
                  <p className="mt-1 text-[12px] text-[var(--attio-accent)]">Net: ₹{a.quoteSnapshot.netAmount.toLocaleString("en-IN")} · {a.quoteSnapshot.packageLabel}</p>
                </div>
                <div className="flex gap-2">
                  <AttioButton
                    variant="primary"
                    onClick={() =>
                      void resolveApproval(a.id, true).then(() => toast("Discount approved", "success"))
                    }
                  >
                    Approve
                  </AttioButton>
                  <AttioButton
                    variant="secondary"
                    onClick={() =>
                      void resolveApproval(a.id, false).then(() => toast("Discount rejected", "success"))
                    }
                  >
                    Reject
                  </AttioButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </PageChrome>
  );
}
