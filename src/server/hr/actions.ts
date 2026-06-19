// @ts-nocheck
"use server";

import { prisma } from "@/lib/prisma";
import {
  buildSeedAttendance,
  buildSeedLeave,
  buildSeedPayroll,
  buildSeedShifts,
  SEED_HR_DEPARTMENTS,
  SEED_HR_EMPLOYEES,
  type HrAttendanceRecord,
  type HrDepartment,
  type HrEmployee,
  type HrLeaveRequest,
  type HrPayrollLine,
  type HrShiftSlot,
} from "@/design-system/hr-data";
import { HR_MANAGER_EMAIL, SEED_HR_PASSWORDS } from "@/lib/hr-auth";
import { DEFAULT_LEAVE_ENTITLEMENT, type HrLeaveRequest } from "@/design-system/hr-data";
import { leaveDays } from "@/lib/hr-platform";
import { requireModule } from "@/server/auth";
import { writeAuditLog } from "@/server/audit-log";
import { clearCrmAbsenceAction, transferCrmAbsenceAction } from "@/server/crm/actions";
import { ensureBootstrapData } from "@/server/bootstrap";

type HrSettings = {
  autoCrmSync: boolean;
  leaveApprovalNotify: boolean;
  attendanceReminder: boolean;
};

export type HrSnapshot = {
  employees: HrEmployee[];
  departments: HrDepartment[];
  shifts: HrShiftSlot[];
  leaveRequests: HrLeaveRequest[];
  attendance: HrAttendanceRecord[];
  payroll: HrPayrollLine[];
  operatorId: string;
  settings: HrSettings;
};

export type HrLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export async function validateHrLoginAction(email: string, password: string): Promise<HrLoginResult> {
  await ensureBootstrapData();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  const employee = await prisma.hrEmployee.findFirst({
    where: { email: normalized, active: true },
  });
  if (!employee) return { ok: false, error: "No HR account for this email." };

  const cred = await prisma.hrCredential.findUnique({ where: { employeeId: employee.id } });
  if (!cred) return { ok: false, error: "Incorrect password." };

  const { verifyPassword, hashPassword, isLegacyHash } = await import("@/server/revenue/password");
  const valid = await verifyPassword(pwd, cred.password);
  if (!valid) return { ok: false, error: "Incorrect password." };

  if (isLegacyHash(cred.password)) {
    await prisma.hrCredential.update({
      where: { employeeId: employee.id },
      data: { password: await hashPassword(pwd) },
    });
  }

  return { ok: true, operatorId: employee.id, name: employee.name, email: employee.email };
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function getSnapshot(operatorId = ""): Promise<HrSnapshot> {
  await requireModule("hr");
  await ensureBootstrapData();
  const [employees, departments, shifts, leaveRequests, attendance, payroll, settings] =
    await Promise.all([
      prisma.hrEmployee.findMany({ orderBy: { name: "asc" } }),
      prisma.hrDepartment.findMany({ orderBy: { name: "asc" } }),
      prisma.hrShift.findMany({ orderBy: [{ date: "desc" }, { startTime: "asc" }] }),
      prisma.hrLeaveRequest.findMany({ orderBy: { requestedAt: "desc" } }),
      prisma.hrAttendance.findMany({ orderBy: [{ date: "desc" }, { employeeId: "asc" }] }),
      prisma.hrPayrollLine.findMany({ orderBy: [{ period: "desc" }, { employeeId: "asc" }] }),
      prisma.hrSetting.upsert({
        where: { id: "hr_settings" },
        update: {},
        create: {
          id: "hr_settings",
          autoCrmSync: true,
          leaveApprovalNotify: true,
          attendanceReminder: false,
        },
      }),
    ]);

  return {
    employees: employees.map((x) => ({ ...x, salaryMonthly: Number(x.salaryMonthly) })),
    departments,
    shifts,
    leaveRequests,
    attendance,
    payroll: payroll.map((x) => ({
      ...x,
      basic: Number(x.basic),
      allowances: Number(x.allowances),
      deductions: Number(x.deductions),
      net: Number(x.net),
    })),
    operatorId,
    settings: {
      autoCrmSync: settings.autoCrmSync,
      leaveApprovalNotify: settings.leaveApprovalNotify,
      attendanceReminder: settings.attendanceReminder,
    },
  };
}

export async function getHrSnapshot(operatorId = "") {
  return getSnapshot(operatorId);
}

export async function addEmployee(
  input: Omit<HrEmployee, "id">,
  operatorId: string,
) {
  await ensureBootstrapData();
  const id = createId("emp");
  await prisma.hrEmployee.create({
    data: {
      id,
      ...input,
    },
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "employee_added",
    entityType: "employee",
    entityId: id,
    summary: `Employee added: ${input.name}`,
  });
  return getSnapshot(operatorId);
}

export async function updateEmployee(
  id: string,
  patch: Partial<HrEmployee>,
  operatorId: string,
) {
  await ensureBootstrapData();
  await prisma.hrEmployee.update({
    where: { id },
    data: patch,
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "employee_updated",
    entityType: "employee",
    entityId: id,
    summary: `Employee updated: ${id}`,
    payload: patch,
  });
  return getSnapshot(operatorId);
}

export async function copyShiftsFromPreviousWeek(targetDate: string, operatorId: string) {
  await ensureBootstrapData();
  const target = new Date(`${targetDate}T12:00:00`);
  const sourceStart = new Date(target);
  sourceStart.setDate(sourceStart.getDate() - 7);
  const sourceEnd = new Date(sourceStart);
  sourceEnd.setDate(sourceEnd.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const sourceShifts = await prisma.hrShift.findMany({
    where: {
      date: { gte: fmt(sourceStart), lte: fmt(sourceEnd) },
    },
  });

  for (const shift of sourceShifts) {
    const shiftDate = new Date(`${shift.date}T12:00:00`);
    shiftDate.setDate(shiftDate.getDate() + 7);
    const newDate = fmt(shiftDate);
    const exists = await prisma.hrShift.findFirst({
      where: { employeeId: shift.employeeId, date: newDate, startTime: shift.startTime },
    });
    if (exists) continue;
    await prisma.hrShift.create({
      data: {
        id: createId("sh"),
        employeeId: shift.employeeId,
        date: newDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        role: shift.role,
      },
    });
  }

  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "shifts_copied",
    entityType: "shift",
    entityId: targetDate,
    summary: `Copied ${sourceShifts.length} shifts from previous week`,
  });
  return getSnapshot(operatorId);
}

export async function addShift(
  input: Omit<HrShiftSlot, "id">,
  operatorId: string,
) {
  await ensureBootstrapData();
  const id = createId("sh");
  await prisma.hrShift.create({ data: { id, ...input } });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "shift_added",
    entityType: "shift",
    entityId: id,
    summary: `Shift added for ${input.employeeId} on ${input.date}`,
  });
  return getSnapshot(operatorId);
}

export async function removeShift(id: string, operatorId: string) {
  await ensureBootstrapData();
  await prisma.hrShift.delete({ where: { id } });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "shift_removed",
    entityType: "shift",
    entityId: id,
    summary: `Shift removed: ${id}`,
  });
  return getSnapshot(operatorId);
}

export async function updateShift(
  id: string,
  patch: Partial<HrShiftSlot>,
  operatorId: string,
) {
  await ensureBootstrapData();
  await prisma.hrShift.update({
    where: { id },
    data: patch,
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "shift_updated",
    entityType: "shift",
    entityId: id,
    summary: `Shift updated: ${id}`,
    payload: patch,
  });
  return getSnapshot(operatorId);
}

export async function addLeaveRequest(
  input: Omit<HrLeaveRequest, "id" | "status" | "requestedAt">,
  operatorId: string,
) {
  await ensureBootstrapData();
  const id = createId("lv");
  await prisma.hrLeaveRequest.create({
    data: {
      id,
      ...input,
      status: "pending",
      requestedAt: new Date().toISOString(),
    },
  });
  await writeAuditLog({
    actor: operatorId || input.employeeId,
    actorRole: "hr",
    module: "hr",
    action: "leave_requested",
    entityType: "leave",
    entityId: id,
    summary: `Leave requested by ${input.employeeId}`,
  });
  return getSnapshot(operatorId);
}

export async function cancelLeaveRequest(id: string, operatorId: string) {
  await ensureBootstrapData();
  await prisma.hrLeaveRequest.deleteMany({ where: { id, status: "pending" } });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "leave_cancelled",
    entityType: "leave",
    entityId: id,
    summary: `Pending leave cancelled: ${id}`,
  });
  return getSnapshot(operatorId);
}

export async function approveLeave(id: string, approved: boolean, operatorId: string) {
  await ensureBootstrapData();
  const leave = await prisma.hrLeaveRequest.findUnique({ where: { id } });
  if (!leave) return { snapshot: await getSnapshot(operatorId), transferred: 0 };
  const employee = await prisma.hrEmployee.findUnique({ where: { id: leave.employeeId } });
  const now = new Date().toISOString();
  let transferred = 0;
  if (approved && leave.syncCrmAbsence && employee?.crmAgentId) {
    const until = new Date(leave.toDate);
    until.setHours(23, 59, 59, 0);
    const result = await transferCrmAbsenceAction({
      crmAgentId: employee.crmAgentId,
      until: until.toISOString(),
      reason: `Leave: ${leave.reason}`,
      transferLeads: true,
    });
    transferred = result.transferred;
  }
  if (!approved && employee?.crmAgentId) {
    await clearCrmAbsenceAction(employee.crmAgentId);
  }
  await prisma.hrLeaveRequest.update({
    where: { id },
    data: {
      status: approved ? "approved" : "rejected",
      resolvedAt: now,
      approverId: operatorId,
    },
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: approved ? "leave_approved" : "leave_rejected",
    entityType: "leave",
    entityId: id,
    summary: approved
      ? `Leave approved: ${id}${transferred ? ` (${transferred} CRM leads transferred)` : ""}`
      : `Leave rejected: ${id}`,
    severity: approved ? "info" : "warning",
  });
  return { snapshot: await getSnapshot(operatorId), transferred };
}

export async function markAttendance(
  input: Omit<HrAttendanceRecord, "id">,
  operatorId: string,
) {
  await ensureBootstrapData();
  const existing = await prisma.hrAttendance.findFirst({
    where: { employeeId: input.employeeId, date: input.date },
  });
  if (existing) {
    await prisma.hrAttendance.update({
      where: { id: existing.id },
      data: input,
    });
  } else {
    await prisma.hrAttendance.create({
      data: { id: createId("att"), ...input },
    });
  }
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "attendance_marked",
    entityType: "attendance",
    entityId: `${input.employeeId}:${input.date}`,
    summary: `Attendance marked ${input.status} for ${input.employeeId}`,
  });
  return getSnapshot(operatorId);
}

export async function checkoutAttendance(
  employeeId: string,
  date: string,
  operatorId: string,
) {
  await ensureBootstrapData();
  const record = await prisma.hrAttendance.findFirst({ where: { employeeId, date } });
  if (!record) return getSnapshot(operatorId);
  await prisma.hrAttendance.update({
    where: { id: record.id },
    data: { checkOut: new Date().toTimeString().slice(0, 5) },
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "attendance_checkout",
    entityType: "attendance",
    entityId: record.id,
    summary: `Checkout recorded for ${employeeId} on ${date}`,
  });
  return getSnapshot(operatorId);
}

export async function processPayroll(period: string, operatorId: string) {
  await ensureBootstrapData();
  await prisma.hrPayrollLine.updateMany({
    where: { period, status: "draft" },
    data: { status: "processed" },
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "payroll_processed",
    entityType: "payroll_period",
    entityId: period,
    summary: `Payroll processed for ${period}`,
  });
  return getSnapshot(operatorId);
}

export async function markPayrollPaid(period: string, operatorId: string) {
  await ensureBootstrapData();
  await prisma.hrPayrollLine.updateMany({
    where: { period, status: "processed" },
    data: { status: "paid" },
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "payroll_paid",
    entityType: "payroll_period",
    entityId: period,
    summary: `Payroll paid for ${period}`,
  });
  return getSnapshot(operatorId);
}

export async function generatePayrollRun(period: string, operatorId: string) {
  await ensureBootstrapData();
  const [employees, existing, leaveRows] = await Promise.all([
    prisma.hrEmployee.findMany({ where: { active: true, role: { not: "manager" } } }),
    prisma.hrPayrollLine.findMany({ where: { period } }),
    prisma.hrLeaveRequest.findMany({ where: { status: "approved" } }),
  ]);
  const leaveRequests: HrLeaveRequest[] = leaveRows.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    type: l.type as HrLeaveRequest["type"],
    fromDate: l.fromDate,
    toDate: l.toDate,
    reason: l.reason,
    status: l.status as HrLeaveRequest["status"],
    requestedAt: l.requestedAt,
    syncCrmAbsence: l.syncCrmAbsence,
  }));
  const existingIds = new Set(existing.map((x) => x.employeeId));
  const [y, m] = period.split("-").map(Number);
  const monthStart = `${period}-01`;
  const monthEnd = `${period}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const leaveDeduction = (employeeId: string, salaryMonthly: number) => {
    const daily = Math.round(salaryMonthly / 30);
    let deduct = 0;
    for (const l of leaveRequests.filter((x) => x.employeeId === employeeId)) {
      const from = l.fromDate > monthStart ? l.fromDate : monthStart;
      const to = l.toDate < monthEnd ? l.toDate : monthEnd;
      if (from > to) continue;
      const days = leaveDays(from, to);
      if (l.type === "unpaid") {
        deduct += daily * days;
        continue;
      }
      const ent =
        l.type === "casual"
          ? DEFAULT_LEAVE_ENTITLEMENT.casual
          : l.type === "sick"
            ? DEFAULT_LEAVE_ENTITLEMENT.sick
            : l.type === "earned"
              ? DEFAULT_LEAVE_ENTITLEMENT.earned
              : 0;
      const usedBefore = leaveRequests
        .filter(
          (x) =>
            x.employeeId === employeeId &&
            x.type === l.type &&
            x.status === "approved" &&
            x.toDate < monthStart,
        )
        .reduce((sum, x) => sum + leaveDays(x.fromDate, x.toDate), 0);
      const remaining = ent - usedBefore;
      if (days > remaining) {
        deduct += daily * (days - Math.max(0, remaining));
      }
    }
    return deduct;
  };

  const lines = employees
    .filter((x) => !existingIds.has(x.id))
    .map((x) => {
      const basic = Math.round(Number(x.salaryMonthly) * 0.82);
      const allowances = Math.round(Number(x.salaryMonthly) * 0.15);
      const leaveDeduct = leaveDeduction(x.id, Number(x.salaryMonthly));
      const statutory = Math.round(Number(x.salaryMonthly) * 0.06);
      const deductions = statutory + leaveDeduct;
      return {
        id: createId(`pay_${x.id}`),
        employeeId: x.id,
        period,
        basic,
        allowances,
        deductions,
        net: basic + allowances - deductions,
        status: "draft",
      };
    });
  if (lines.length) {
    await prisma.hrPayrollLine.createMany({ data: lines });
    await writeAuditLog({
      actor: operatorId || "HR",
      actorRole: "hr",
      module: "hr",
      action: "payroll_generated",
      entityType: "payroll_period",
      entityId: period,
      summary: `Payroll generated for ${lines.length} employees (${period})`,
    });
  }
  return { snapshot: await getSnapshot(operatorId), created: lines.length };
}

export async function resetHrDemo(operatorId: string) {
  await ensureBootstrapData();
  await prisma.$transaction([
    prisma.hrShift.deleteMany(),
    prisma.hrLeaveRequest.deleteMany(),
    prisma.hrAttendance.deleteMany(),
    prisma.hrPayrollLine.deleteMany(),
    prisma.hrCredential.deleteMany(),
    prisma.hrEmployee.deleteMany(),
    prisma.hrDepartment.deleteMany(),
  ]);
  await prisma.hrDepartment.createMany({ data: SEED_HR_DEPARTMENTS });
  await prisma.hrEmployee.createMany({ data: SEED_HR_EMPLOYEES });
  await prisma.hrCredential.createMany({
    data: Object.entries(SEED_HR_PASSWORDS).map(([employeeId, password]) => ({
      employeeId,
      password,
    })),
  });
  await prisma.hrShift.createMany({ data: buildSeedShifts() });
  await prisma.hrLeaveRequest.createMany({
    data: buildSeedLeave().map((x) => ({
      ...x,
      syncCrmAbsence: Boolean(x.syncCrmAbsence),
    })),
  });
  await prisma.hrAttendance.createMany({ data: buildSeedAttendance() });
  await prisma.hrPayrollLine.createMany({ data: buildSeedPayroll() });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "hr_demo_reset",
    entityType: "hr_state",
    entityId: "seed",
    summary: "HR seed data reset",
    severity: "warning",
  });
  return getSnapshot(operatorId);
}

export async function updateHrSettings(
  patch: Partial<HrSettings>,
  operatorId: string,
) {
  await ensureBootstrapData();
  await prisma.hrSetting.update({
    where: { id: "hr_settings" },
    data: patch,
  });
  await writeAuditLog({
    actor: operatorId || "HR",
    actorRole: "hr",
    module: "hr",
    action: "hr_settings_updated",
    entityType: "settings",
    entityId: "hr_settings",
    summary: "HR settings updated",
    payload: patch,
  });
  return getSnapshot(operatorId);
}

export async function getHrOrgChart(operatorId = "") {
  const snapshot = await getSnapshot(operatorId);
  return {
    nodes: snapshot.employees,
    departments: snapshot.departments,
    kpis: computeHrKpis(
      snapshot.employees,
      snapshot.leaveRequests,
      snapshot.attendance,
      snapshot.payroll,
    ),
  };
}
