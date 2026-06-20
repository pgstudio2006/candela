"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function HrSettingsPage() {
  const { getOperator, settings, updateSettings, isManager } = useHrStore();
  const op = getOperator();
  const manager = isManager();

  return (
    <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Settings" }]} title="HR settings" meta="Account · policies · CRM integration">
      <Panel title="Signed in as">
        <p className="text-[13px]">{op?.name} · {op?.email}</p>
        <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">{op?.designation} · {op?.role}</p>
      </Panel>
      {manager ? (
        <Panel title="Leave & CRM policies" className="mt-4">
          <div className="space-y-3 text-[13px]">
            <label className="flex items-center justify-between gap-4">
              <span>Auto-sync CRM absence on approved leave</span>
              <input
                type="checkbox"
                checked={settings.autoCrmSync}
                onChange={async (e) => updateSettings({ autoCrmSync: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Notify manager on new leave requests</span>
              <input
                type="checkbox"
                checked={settings.leaveApprovalNotify}
                onChange={async (e) => updateSettings({ leaveApprovalNotify: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Daily attendance reminder</span>
              <input
                type="checkbox"
                checked={settings.attendanceReminder}
                onChange={async (e) => updateSettings({ attendanceReminder: e.target.checked })}
              />
            </label>
          </div>
        </Panel>
      ) : (
        <Panel title="Policies" className="mt-4">
          <p className="text-[13px] text-[var(--attio-text-secondary)]">
            Organization policies are managed by your HR manager.
          </p>
        </Panel>
      )}
      <Panel title="CRM integration" className="mt-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">
          When leave is approved for CRM-linked staff, their CRM agent is marked absent and open leads transfer to their backup assignee automatically.
        </p>
        <p className="mt-2 text-[12px] text-[var(--attio-text-tertiary)]">
          Configure backup agents and distribution rules in CRM → Team.
        </p>
      </Panel>
    </PageChrome>
  );
}
