"use client";

import { LeaveRequestModal } from "@/components/hr/forms";
import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { DEFAULT_LEAVE_ENTITLEMENT, LEAVE_TYPE_LABELS } from "@/design-system/hr-data";
import { computeLeaveBalance, leaveDays } from "@/lib/hr-platform";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function HrLeavePage() {
  const { leaveRequests, employees, approveLeave, addLeaveRequest, cancelLeaveRequest, isManager, operatorId } = useHrStore();
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const op = employees.find((e) => e.id === operatorId);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Leave" }]}
      title="Leave management"
      meta="Requests · approvals · auto CRM lead transfer when absent"
      actions={<AttioButton variant="primary" onClick={() => setFormOpen(true)}><Plus className="size-3.5" /> Request leave</AttioButton>}
    >
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-800">{toast}</div>
      )}
      {op && (
        <Panel title="Your leave balance" className="mb-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {(["casual", "sick", "earned"] as const).map((t) => {
              const bal = computeLeaveBalance(op.id, leaveRequests);
              return (
                <div key={t} className="rounded-lg border p-3 text-center">
                  <p className="text-[11px] text-[var(--attio-text-tertiary)]">{LEAVE_TYPE_LABELS[t]}</p>
                  <p className="text-[22px] font-semibold">{bal[t]}</p>
                  <p className="text-[10px] text-[var(--attio-text-tertiary)]">of {DEFAULT_LEAVE_ENTITLEMENT[t]} days</p>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <DataTable
        columns={[
          { key: "employee", label: "Employee" },
          { key: "type", label: "Type" },
          { key: "dates", label: "Dates" },
          { key: "days", label: "Days" },
          { key: "reason", label: "Reason" },
          { key: "crm", label: "CRM sync" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={leaveRequests.map((l) => {
          const emp = employees.find((e) => e.id === l.employeeId);
          return {
            employee: emp?.name ?? l.employeeId,
            type: LEAVE_TYPE_LABELS[l.type],
            dates: `${l.fromDate} → ${l.toDate}`,
            days: leaveDays(l.fromDate, l.toDate),
            reason: l.reason,
            crm: l.syncCrmAbsence && emp?.crmAgentId ? <StatusBadge label="Transfer leads" variant="warning" /> : "—",
            status: <StatusBadge label={l.status} variant={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "neutral"} />,
            actions: (
              <div className="flex gap-1">
                {isManager() && l.status === "pending" && (
                  <>
                    <AttioButton
                      variant="primary"
                      className="!h-7 !text-[11px]"
                      onClick={async () => {
                        const { transferred } = await approveLeave(l.id, true);
                        showToast(transferred > 0 ? `Approved · ${transferred} CRM lead(s) transferred` : "Leave approved");
                      }}
                    >
                      Approve
                    </AttioButton>
                    <AttioButton
                      variant="secondary"
                      className="!h-7 !text-[11px]"
                      onClick={async () => {
                        await approveLeave(l.id, false);
                      }}
                    >
                      Reject
                    </AttioButton>
                  </>
                )}
                {l.status === "pending" && l.employeeId === operatorId && (
                  <AttioButton variant="secondary" className="!h-7 !text-[11px]" onClick={() => cancelLeaveRequest(l.id)}>Cancel</AttioButton>
                )}
              </div>
            ),
          };
        })}
      />
      {formOpen && (
        <LeaveRequestModal
          employees={employees}
          operatorId={operatorId}
          isManager={isManager()}
          onClose={() => setFormOpen(false)}
          onSave={(data) => addLeaveRequest(data)}
        />
      )}
    </PageChrome>
  );
}
