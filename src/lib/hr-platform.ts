import {
  DEFAULT_LEAVE_ENTITLEMENT,
  type AttendanceStatus,
  type HrAttendanceRecord,
  type HrDepartment,
  type HrEmployee,
  type HrLeaveRequest,
  type HrPayrollLine,
  type HrShiftSlot,
  type LeaveType,
} from "@/design-system/hr-data";

export type HrKpi = { label: string; value: string; delta: string; trend: "up" | "down" | "neutral" };

export function computeHrKpis(
  employees: HrEmployee[],
  leave: HrLeaveRequest[],
  attendance: HrAttendanceRecord[],
  payroll: HrPayrollLine[],
): HrKpi[] {
  const active = employees.filter((e) => e.active && e.role !== "manager").length;
  const pendingLeave = leave.filter((l) => l.status === "pending").length;
  const today = new Date().toISOString().slice(0, 10);
  const presentToday = attendance.filter(
    (a) => a.date === today && (a.status === "present" || a.status === "late"),
  ).length;
  const payrollDraft = payroll.filter((p) => p.status === "draft").length;

  return [
    { label: "Active staff", value: String(active), delta: "Across all departments", trend: "neutral" },
    { label: "Present today", value: String(presentToday), delta: "Checked in", trend: "up" },
    { label: "Leave pending", value: String(pendingLeave), delta: "Needs approval", trend: pendingLeave ? "down" : "neutral" },
    { label: "Payroll drafts", value: String(payrollDraft), delta: "This month", trend: "neutral" },
  ];
}

export type OrgNode = {
  employee: HrEmployee;
  children: OrgNode[];
};

export function buildOrgTree(employees: HrEmployee[], rootId?: string): OrgNode[] {
  const roots = employees.filter((e) => (rootId ? e.managerId === rootId : !e.managerId));
  const build = (emp: HrEmployee): OrgNode => ({
    employee: emp,
    children: employees.filter((e) => e.managerId === emp.id).map(build),
  });
  return roots.map(build);
}

export function getDepartmentName(departments: HrDepartment[], id: string) {
  return departments.find((d) => d.id === id)?.name ?? id;
}

export function shiftsForDate(shifts: HrShiftSlot[], date: string) {
  return shifts.filter((s) => s.date === date);
}

export function leaveDays(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function isDateInRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

export function isOnLeave(employeeId: string, date: string, leave: HrLeaveRequest[]) {
  return leave.some(
    (l) =>
      l.employeeId === employeeId &&
      l.status === "approved" &&
      isDateInRange(date, l.fromDate, l.toDate),
  );
}

export function computeLeaveBalance(employeeId: string, leave: HrLeaveRequest[]) {
  const used = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
  leave
    .filter((l) => l.employeeId === employeeId && l.status === "approved" && l.type !== "unpaid")
    .forEach((l) => {
      const days = leaveDays(l.fromDate, l.toDate);
      if (l.type in used) used[l.type as keyof typeof used] += days;
    });
  return {
    casual: DEFAULT_LEAVE_ENTITLEMENT.casual - used.casual,
    sick: DEFAULT_LEAVE_ENTITLEMENT.sick - used.sick,
    earned: DEFAULT_LEAVE_ENTITLEMENT.earned - used.earned,
    used,
  };
}

export function weekDates(anchor: string): string[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

export function formatWeekday(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
}

export function computePayrollLine(employee: HrEmployee, period: string): Omit<HrPayrollLine, "id" | "status"> {
  const basic = Math.round(employee.salaryMonthly * 0.82);
  const allowances = Math.round(employee.salaryMonthly * 0.15);
  const deductions = Math.round(employee.salaryMonthly * 0.06);
  return {
    employeeId: employee.id,
    period,
    basic,
    allowances,
    deductions,
    net: basic + allowances - deductions,
  };
}

export function resolveAttendanceStatus(
  employeeId: string,
  date: string,
  attendance: HrAttendanceRecord[],
  leave: HrLeaveRequest[],
): AttendanceStatus | "not_marked" {
  const rec = attendance.find((a) => a.employeeId === employeeId && a.date === date);
  if (rec) return rec.status;
  if (isOnLeave(employeeId, date, leave)) return "on_leave";
  return "not_marked";
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half day",
  on_leave: "On leave",
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  casual: "bg-blue-50 text-blue-700",
  sick: "bg-red-50 text-red-700",
  earned: "bg-emerald-50 text-emerald-700",
  unpaid: "bg-gray-50 text-gray-600",
};
