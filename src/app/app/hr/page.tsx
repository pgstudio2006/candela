"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { LEAVE_TYPE_LABELS } from "@/design-system/hr-data";
import { isOnLeave, leaveDays } from "@/lib/hr-platform";
import Link from "next/link";

export default function HrDashboardPage() {
  const { employees, departments, leaveRequests, shifts, attendance, getHrKpis, isManager } = useHrStore();
  const kpis = getHrKpis();
  const pendingLeave = leaveRequests.filter((l) => l.status === "pending");
  const today = new Date().toISOString().slice(0, 10);
  const todayShifts = shifts.filter((s) => s.date === today);
  const onLeaveToday = employees.filter((e) => e.active && e.role !== "manager" && isOnLeave(e.id, today, leaveRequests));

  return (
    <PageChrome
      breadcrumbs={[{ label: "HR", href: "/app/hr" }]}
      title="HR command center"
      meta="People · scheduling · leave · attendance · payroll"
    >
      <MetricStrip metrics={kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pending leave approvals" action={isManager() ? <Link href="/app/hr/leave" className="text-[11px] text-[var(--attio-accent)]">Review →</Link> : undefined}>
          <ul className="divide-y">
            {pendingLeave.length === 0 && <li className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No pending requests</li>}
            {pendingLeave.map((l) => {
              const emp = employees.find((e) => e.id === l.employeeId);
              return (
                <li key={l.id} className="py-3 text-[13px]">
                  <p className="font-medium">{emp?.name}</p>
                  <p className="text-[12px] text-[var(--attio-text-tertiary)]">
                    {LEAVE_TYPE_LABELS[l.type]} · {l.fromDate} → {l.toDate} ({leaveDays(l.fromDate, l.toDate)}d)
                    {l.syncCrmAbsence && emp?.crmAgentId && " · CRM leads will transfer"}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title={`Today's shifts (${today})`} action={<Link href="/app/hr/scheduling" className="text-[11px] text-[var(--attio-accent)]">Roster →</Link>}>
          <ul className="divide-y">
            {todayShifts.length === 0 && <li className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No shifts scheduled — add from Scheduling</li>}
            {todayShifts.map((s) => {
              const emp = employees.find((e) => e.id === s.employeeId);
              const att = attendance.find((a) => a.employeeId === s.employeeId && a.date === today);
              const onLeave = emp && isOnLeave(emp.id, today, leaveRequests);
              return (
                <li key={s.id} className="flex items-center justify-between py-3 text-[13px]">
                  <div>
                    <p className="font-medium">{emp?.name}</p>
                    <p className="text-[12px] text-[var(--attio-text-tertiary)]">{s.startTime}–{s.endTime} · {s.location}</p>
                  </div>
                  {onLeave ? (
                    <StatusBadge label="On leave" variant="warning" />
                  ) : att ? (
                    <StatusBadge label={att.status} variant={att.status === "present" ? "success" : att.status === "late" ? "warning" : "neutral"} />
                  ) : (
                    <StatusBadge label="Not marked" variant="neutral" />
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      {onLeaveToday.length > 0 && (
        <Panel title="On leave today" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {onLeaveToday.map((e) => (
              <span key={e.id} className="rounded-full border px-3 py-1 text-[12px]">{e.name}</span>
            ))}
          </div>
        </Panel>
      )}
      <Panel title="Headcount by department" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {departments.map((d) => (
            <div key={d.id} className="rounded-lg border p-3 text-[13px]">
              <p className="font-medium">{d.name}</p>
              <p className="mt-1 text-[20px] font-semibold">{employees.filter((e) => e.departmentId === d.id && e.active).length}</p>
            </div>
          ))}
        </div>
      </Panel>
    </PageChrome>
  );
}
