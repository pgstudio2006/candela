"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { type AttendanceStatus } from "@/design-system/hr-data";
import { ATTENDANCE_STATUS_LABELS, isOnLeave, resolveAttendanceStatus } from "@/lib/hr-platform";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const STATUS_VARIANT: Record<AttendanceStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  half_day: "info",
  on_leave: "neutral",
};

export default function HrAttendancePage() {
  const { attendance, employees, leaveRequests, markAttendance, checkoutAttendance, isManager } = useHrStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const rows = attendance.filter((a) => a.date === date);
  const staff = employees.filter((e) => e.active && e.role !== "manager");

  const markWithStatus = (employeeId: string, status: AttendanceStatus) => {
    markAttendance({
      employeeId,
      date,
      checkIn: new Date().toTimeString().slice(0, 5),
      checkOut: status === "half_day" ? new Date().toTimeString().slice(0, 5) : undefined,
      status,
    });
  };

  return (
    <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Attendance" }]} title="Attendance" meta="Daily check-in · check-out · leave overlap">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40 text-[13px]" />
        {isManager() && (
          <AttioButton variant="secondary" className="!h-9" onClick={() => {
            staff.forEach((e) => {
              if (isOnLeave(e.id, date, leaveRequests)) {
                markAttendance({ employeeId: e.id, date, status: "on_leave" });
              }
            });
          }}>
            Sync leave overlap
          </AttioButton>
        )}
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Employee" },
          { key: "in", label: "Check in" },
          { key: "out", label: "Check out" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={staff.map((e) => {
          const rec = rows.find((a) => a.employeeId === e.id);
          const resolved = resolveAttendanceStatus(e.id, date, attendance, leaveRequests);
          const onLeave = isOnLeave(e.id, date, leaveRequests);
          return {
            name: e.name,
            in: rec?.checkIn ?? (onLeave ? "—" : "—"),
            out: rec?.checkOut ?? "—",
            status: resolved === "not_marked" ? (
              onLeave ? <StatusBadge label="On leave (pending mark)" variant="warning" /> : <StatusBadge label="Not marked" variant="neutral" />
            ) : (
              <StatusBadge label={ATTENDANCE_STATUS_LABELS[resolved as AttendanceStatus]} variant={STATUS_VARIANT[resolved as AttendanceStatus]} />
            ),
            actions: (
              <div className="flex flex-wrap gap-1">
                {!rec && !onLeave && (
                  <>
                    <AttioButton variant="secondary" className="!h-7 !text-[11px]" onClick={() => markWithStatus(e.id, "present")}>Mark in</AttioButton>
                    <AttioButton variant="secondary" className="!h-7 !text-[11px]" onClick={() => markWithStatus(e.id, "late")}>Late</AttioButton>
                  </>
                )}
                {rec && !rec.checkOut && rec.status !== "on_leave" && (
                  <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => checkoutAttendance(e.id, date)}>Check out</AttioButton>
                )}
                {isManager() && !rec && onLeave && (
                  <AttioButton variant="secondary" className="!h-7 !text-[11px]" onClick={() => markAttendance({ employeeId: e.id, date, status: "on_leave" })}>Mark on leave</AttioButton>
                )}
                {isManager() && rec && (
                  <AttioButton variant="secondary" className="!h-7 !text-[11px]" onClick={() => markWithStatus(e.id, "absent")}>Absent</AttioButton>
                )}
              </div>
            ),
          };
        })}
      />
    </PageChrome>
  );
}
