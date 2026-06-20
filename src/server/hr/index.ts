import { prisma } from "@/lib/prisma";
import {
  buildSeedAttendance,
  buildSeedLeave,
  buildSeedPayroll,
  buildSeedShifts,
  DEFAULT_LEAVE_ENTITLEMENT,
  SEED_HR_DEPARTMENTS,
  SEED_HR_EMPLOYEES,
  type HrAttendanceRecord,
  type HrDepartment,
  type HrEmployee,
  type HrLeaveRequest,
  type HrPayrollLine,
  type HrShiftSlot,
} from "@/design-system/hr-data";
import { SEED_HR_PASSWORDS, generateEmployeePassword, isHrManagerEmployee } from "@/lib/hr-auth";
import {
  validateEmployeeInput,
  validateLeaveRequestInput,
  validatePassword,
  validateShiftInput,
} from "@/lib/hr-validation";
import { leaveDays, computeLeaveBalance, computeHrKpis } from "@/lib/hr-platform";
import { resolveHrOperator } from "@/server/module-operator";
import { assertLeaveAccess, assertManager, requireEmployeeInBranch } from "@/server/hr/guards";
import { writePlatformAudit } from "@/server/platform-audit";
import { clearCrmAbsenceAction, transferCrmAbsenceAction } from "@/server/crm/actions";
import { ensureBootstrapData } from "@/server/bootstrap";
import { ServerActionError } from "@/server/errors";
import type { ServerContext } from "@/server/context";
import { readCrmWorkspace } from "@/server/workspace-state";
import { defaultCrmState } from "@/server/revenue/state-seeds";
import { notifyLeaveApproval } from "@/server/notifications";
import { hashPassword } from "@/server/revenue/password";

export type HrSettings = {
  autoCrmSync: boolean;
  leaveApprovalNotify: boolean;
  attendanceReminder: boolean;
};

export type CrmAgentOption = { id: string; label: string };

export type HrSnapshot = {
  employees: HrEmployee[];
  departments: HrDepartment[];
  shifts: HrShiftSlot[];
  leaveRequests: HrLeaveRequest[];
  attendance: HrAttendanceRecord[];
  payroll: HrPayrollLine[];
  operatorId: string;
  activeOperatorId: string;
  activeOperatorName: string;
  isManager: boolean;
  crmAgents: CrmAgentOption[];
  settings: HrSettings;
};

export type HrLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function settingsId(ctx: ServerContext) {
  return `hr_settings_${ctx.tenantId}_${ctx.branchId}`;
}

async function loadSettings(ctx: ServerContext): Promise<HrSettings> {
  const scopedId = settingsId(ctx);
  let row = await prisma.hrSetting.findUnique({ where: { id: scopedId } });
  if (!row) {
    const legacy = await prisma.hrSetting.findUnique({ where: { id: "hr_settings" } });
    row = await prisma.hrSetting.upsert({
      where: { id: scopedId },
      create: {
        id: scopedId,
        autoCrmSync: legacy?.autoCrmSync ?? true,
        leaveApprovalNotify: legacy?.leaveApprovalNotify ?? true,
        attendanceReminder: legacy?.attendanceReminder ?? false,
      },
      update: {},
    });
  }
  return {
    autoCrmSync: row.autoCrmSync,
    leaveApprovalNotify: row.leaveApprovalNotify,
    attendanceReminder: row.attendanceReminder,
  };
}

async function loadCrmAgents(ctx: ServerContext): Promise<CrmAgentOption[]> {
  try {
    const crm = await readCrmWorkspace(ctx, () => defaultCrmState({}));
    return crm.agents
      .filter((a) => a.active && a.role !== "manager")
      .map((a) => ({ id: a.id, label: `${a.name} (CRM)` }));
  } catch {
    return [];
  }
}

async function branchEmployeeIds(ctx: ServerContext) {
  const rows = await prisma.hrEmployee.findMany({
    where: { branchId: ctx.branchId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getHrSnapshotForContext(ctx: ServerContext, operatorId: string): Promise<HrSnapshot> {
  await ensureBootstrapData();
  const employeeIds = await branchEmployeeIds(ctx);
  const idFilter = employeeIds.length ? { in: employeeIds } : { in: ["__none__"] };

  const [employees, departments, shifts, leaveRequests, attendance, payroll, settings, crmAgents] =
    await Promise.all([
      prisma.hrEmployee.findMany({ where: { branchId: ctx.branchId }, orderBy: { name: "asc" } }),
      prisma.hrDepartment.findMany({ orderBy: { name: "asc" } }),
      prisma.hrShift.findMany({
        where: { employeeId: idFilter },
        orderBy: [{ date: "desc" }, { startTime: "asc" }],
      }),
      prisma.hrLeaveRequest.findMany({
        where: { employeeId: idFilter },
        orderBy: { requestedAt: "desc" },
      }),
      prisma.hrAttendance.findMany({
        where: { employeeId: idFilter },
        orderBy: [{ date: "desc" }, { employeeId: "asc" }],
      }),
      prisma.hrPayrollLine.findMany({
        where: { employeeId: idFilter },
        orderBy: [{ period: "desc" }, { employeeId: "asc" }],
      }),
      loadSettings(ctx),
      loadCrmAgents(ctx),
    ]);

  const operator = employees.find((e) => e.id === operatorId);
  return {
    employees: employees.map((x) => ({ ...x, salaryMonthly: Number(x.salaryMonthly) })) as HrEmployee[],
    departments: departments as HrDepartment[],
    shifts: shifts as HrShiftSlot[],
    leaveRequests: leaveRequests as HrLeaveRequest[],
    attendance: attendance.map((x) => ({
      ...x,
      checkIn: x.checkIn ?? undefined,
      checkOut: x.checkOut ?? undefined,
      notes: x.notes ?? undefined,
    })) as HrAttendanceRecord[],
    payroll: payroll.map((x) => ({
      ...x,
      basic: Number(x.basic),
      allowances: Number(x.allowances),
      deductions: Number(x.deductions),
      net: Number(x.net),
    })) as HrPayrollLine[],
    operatorId,
    activeOperatorId: operatorId,
    activeOperatorName: operator?.name ?? "HR",
    isManager: operator ? isHrManagerEmployee({ id: operator.id, role: operator.role }) : false,
    crmAgents,
    settings,
  };
}

export async function listHrAuditLogs(ctx: ServerContext, input: { limit?: number; cursor?: string }) {
  const limit = Math.min(100, Math.max(10, input.limit ?? 50));
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      module: "hr",
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actor: r.actor,
    actorRole: r.actorRole ?? "",
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    severity: r.severity,
  }));
}

export async function validateHrLogin(email: string, password: string): Promise<HrLoginResult> {
  await ensureBootstrapData();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  const employee = await prisma.hrEmployee.findFirst({
    where: { email: normalized, active: true },
  });
  if (!employee) return { ok: false, error: "No HR account for this email." };

  const cred = await prisma.hrCredential.findUnique({ where: { employeeId: employee.id } });
  if (!cred) return { ok: false, error: "No workspace login for this employee. Ask HR to provision credentials." };

  const { verifyPassword, isLegacyHash } = await import("@/server/revenue/password");
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

export async function addEmployee(
  ctx: ServerContext,
  input: Omit<HrEmployee, "id">,
  password?: string,
) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  validateEmployeeInput({ ...input, branchId: ctx.branchId });
  const email = input.email.trim().toLowerCase();
  const dup = await prisma.hrEmployee.findFirst({ where: { email } });
  if (dup) throw new ServerActionError("CONFLICT", "An employee with this email already exists.");

  await ensureBootstrapData();
  const id = createId("emp");
  const initialPassword = password?.trim() || generateEmployeePassword();

  await prisma.hrEmployee.create({
    data: {
      id,
      ...input,
      email,
      branchId: ctx.branchId,
    },
  });
  await prisma.hrCredential.create({
    data: { employeeId: id, password: await hashPassword(initialPassword) },
  });

  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "employee_added",
    entityType: "employee",
    entityId: id,
    summary: `Employee added: ${input.name}`,
    payload: { email },
  });

  return {
    snapshot: await getHrSnapshotForContext(ctx, operatorId),
    initialPassword,
  };
}

export async function setEmployeePassword(ctx: ServerContext, employeeId: string, password: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  const validated = validatePassword(password);
  await requireEmployeeInBranch(ctx, employeeId);
  await prisma.hrCredential.upsert({
    where: { employeeId },
    create: { employeeId, password: await hashPassword(validated) },
    update: { password: await hashPassword(validated) },
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "employee_password_set",
    entityType: "employee",
    entityId: employeeId,
    summary: `Workspace password reset for employee ${employeeId}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function updateEmployee(ctx: ServerContext, id: string, patch: Partial<HrEmployee>) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await requireEmployeeInBranch(ctx, id);
  await prisma.hrEmployee.update({ where: { id }, data: patch });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "employee_updated",
    entityType: "employee",
    entityId: id,
    summary: `Employee updated: ${id}`,
    payload: patch,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function copyShiftsFromPreviousWeek(ctx: ServerContext, targetDate: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await ensureBootstrapData();
  const employeeIds = await branchEmployeeIds(ctx);
  const target = new Date(`${targetDate}T12:00:00`);
  const sourceStart = new Date(target);
  sourceStart.setDate(sourceStart.getDate() - 7);
  const sourceEnd = new Date(sourceStart);
  sourceEnd.setDate(sourceEnd.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const sourceShifts = await prisma.hrShift.findMany({
    where: {
      employeeId: { in: employeeIds },
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

  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "shifts_copied",
    entityType: "shift",
    entityId: targetDate,
    summary: `Copied ${sourceShifts.length} shifts from previous week`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function addShift(ctx: ServerContext, input: Omit<HrShiftSlot, "id">) {
  const { operatorId } = await resolveHrOperator();
  validateShiftInput(input);
  await requireEmployeeInBranch(ctx, input.employeeId);
  await ensureBootstrapData();
  const id = createId("sh");
  await prisma.hrShift.create({ data: { id, ...input } });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "shift_added",
    entityType: "shift",
    entityId: id,
    summary: `Shift added for ${input.employeeId} on ${input.date}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function removeShift(ctx: ServerContext, id: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await prisma.hrShift.delete({ where: { id } });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "shift_removed",
    entityType: "shift",
    entityId: id,
    summary: `Shift removed: ${id}`,
    severity: "warning",
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function updateShift(ctx: ServerContext, id: string, patch: Partial<HrShiftSlot>) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await prisma.hrShift.update({ where: { id }, data: patch });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "shift_updated",
    entityType: "shift",
    entityId: id,
    summary: `Shift updated: ${id}`,
    payload: patch,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function addLeaveRequest(
  ctx: ServerContext,
  input: Omit<HrLeaveRequest, "id" | "status" | "requestedAt">,
) {
  const { operatorId, isManager } = await resolveHrOperator();
  validateLeaveRequestInput(input);
  assertLeaveAccess(isManager, operatorId, input.employeeId);
  await requireEmployeeInBranch(ctx, input.employeeId);
  await ensureBootstrapData();

  if (input.fromDate > input.toDate) {
    throw new ServerActionError("BAD_REQUEST", "Leave end date must be on or after start date.");
  }
  const days = leaveDays(input.fromDate, input.toDate);
  if (days <= 0) throw new ServerActionError("BAD_REQUEST", "Select a valid leave date range.");

  const snapshot = await getHrSnapshotForContext(ctx, operatorId);
  if (input.type !== "unpaid") {
    const balances = computeLeaveBalance(input.employeeId, snapshot.leaveRequests);
    const remaining = balances[input.type as "casual" | "sick" | "earned"] ?? 0;
    if (days > remaining) {
      throw new ServerActionError("BAD_REQUEST", `Insufficient leave balance (${remaining} day(s) remaining for ${input.type}).`);
    }
  }
  const overlap = snapshot.leaveRequests.find(
    (l) =>
      l.employeeId === input.employeeId &&
      l.status !== "rejected" &&
      input.fromDate <= l.toDate &&
      input.toDate >= l.fromDate,
  );
  if (overlap) throw new ServerActionError("BAD_REQUEST", "Leave dates overlap an existing request.");

  const id = createId("lv");
  await prisma.hrLeaveRequest.create({
    data: { id, ...input, status: "pending", requestedAt: new Date().toISOString() },
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "leave_requested",
    entityType: "leave",
    entityId: id,
    summary: `Leave requested for ${input.employeeId}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function cancelLeaveRequest(ctx: ServerContext, id: string) {
  const { operatorId, isManager } = await resolveHrOperator();
  const leave = await prisma.hrLeaveRequest.findUnique({ where: { id } });
  if (!leave) return getHrSnapshotForContext(ctx, operatorId);
  assertLeaveAccess(isManager, operatorId, leave.employeeId);
  await prisma.hrLeaveRequest.deleteMany({ where: { id, status: "pending" } });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "leave_cancelled",
    entityType: "leave",
    entityId: id,
    summary: `Pending leave cancelled: ${id}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function approveLeave(ctx: ServerContext, id: string, approved: boolean) {
  const { operatorId } = await resolveHrOperator(true);
  await ensureBootstrapData();
  const leave = await prisma.hrLeaveRequest.findUnique({ where: { id } });
  if (!leave) return { snapshot: await getHrSnapshotForContext(ctx, operatorId), transferred: 0 };

  const employee = await prisma.hrEmployee.findUnique({ where: { id: leave.employeeId } });
  const settings = await loadSettings(ctx);
  const now = new Date().toISOString();
  let transferred = 0;

  if (approved && (leave.syncCrmAbsence || settings.autoCrmSync) && employee?.crmAgentId) {
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
  if (!approved && leave.status === "approved" && employee?.crmAgentId) {
    await clearCrmAbsenceAction(employee.crmAgentId);
  }

  await prisma.hrLeaveRequest.update({
    where: { id },
    data: { status: approved ? "approved" : "rejected", resolvedAt: now, approverId: operatorId },
  });

  if (settings.leaveApprovalNotify && employee?.email) {
    await notifyLeaveApproval(ctx, {
      employeeEmail: employee.email,
      employeeName: employee.name,
      approved,
    });
  }

  await writePlatformAudit({
    ctx,
    module: "hr",
    action: approved ? "leave_approved" : "leave_rejected",
    entityType: "leave",
    entityId: id,
    summary: approved
      ? `Leave approved${transferred ? ` · ${transferred} CRM leads transferred` : ""}`
      : `Leave rejected: ${id}`,
    severity: approved ? "info" : "warning",
  });

  return { snapshot: await getHrSnapshotForContext(ctx, operatorId), transferred };
}

export async function markAttendance(ctx: ServerContext, input: Omit<HrAttendanceRecord, "id">) {
  const { operatorId } = await resolveHrOperator();
  await requireEmployeeInBranch(ctx, input.employeeId);
  await ensureBootstrapData();
  const existing = await prisma.hrAttendance.findFirst({
    where: { employeeId: input.employeeId, date: input.date },
  });
  if (existing) {
    await prisma.hrAttendance.update({ where: { id: existing.id }, data: input });
  } else {
    await prisma.hrAttendance.create({ data: { id: createId("att"), ...input } });
  }
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "attendance_marked",
    entityType: "attendance",
    entityId: `${input.employeeId}:${input.date}`,
    summary: `Attendance ${input.status} for ${input.employeeId}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function checkoutAttendance(ctx: ServerContext, employeeId: string, date: string) {
  const { operatorId } = await resolveHrOperator();
  await requireEmployeeInBranch(ctx, employeeId);
  const record = await prisma.hrAttendance.findFirst({ where: { employeeId, date } });
  if (!record) return getHrSnapshotForContext(ctx, operatorId);
  await prisma.hrAttendance.update({
    where: { id: record.id },
    data: { checkOut: new Date().toTimeString().slice(0, 5) },
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "attendance_checkout",
    entityType: "attendance",
    entityId: record.id,
    summary: `Checkout for ${employeeId} on ${date}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function processPayroll(ctx: ServerContext, period: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  const employeeIds = await branchEmployeeIds(ctx);
  await prisma.hrPayrollLine.updateMany({
    where: { period, status: "draft", employeeId: { in: employeeIds } },
    data: { status: "processed" },
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "payroll_processed",
    entityType: "payroll_period",
    entityId: period,
    summary: `Payroll processed for ${period}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function markPayrollPaid(ctx: ServerContext, period: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  const employeeIds = await branchEmployeeIds(ctx);
  await prisma.hrPayrollLine.updateMany({
    where: { period, status: "processed", employeeId: { in: employeeIds } },
    data: { status: "paid" },
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "payroll_paid",
    entityType: "payroll_period",
    entityId: period,
    summary: `Payroll marked paid for ${period}`,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function generatePayrollRun(ctx: ServerContext, period: string) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await ensureBootstrapData();
  const employeeIds = await branchEmployeeIds(ctx);
  const [employees, existing, leaveRows] = await Promise.all([
    prisma.hrEmployee.findMany({
      where: { active: true, role: { not: "manager" }, branchId: ctx.branchId },
    }),
    prisma.hrPayrollLine.findMany({ where: { period, employeeId: { in: employeeIds } } }),
    prisma.hrLeaveRequest.findMany({
      where: { status: "approved", employeeId: { in: employeeIds } },
    }),
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

  const leaveDeduction = (empId: string, salaryMonthly: number) => {
    const daily = Math.round(salaryMonthly / 30);
    let deduct = 0;
    for (const l of leaveRequests.filter((x) => x.employeeId === empId)) {
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
            x.employeeId === empId &&
            x.type === l.type &&
            x.status === "approved" &&
            x.toDate < monthStart,
        )
        .reduce((sum, x) => sum + leaveDays(x.fromDate, x.toDate), 0);
      const remaining = ent - usedBefore;
      if (days > remaining) deduct += daily * (days - Math.max(0, remaining));
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
    await writePlatformAudit({
      ctx,
      module: "hr",
      action: "payroll_generated",
      entityType: "payroll_period",
      entityId: period,
      summary: `Payroll generated for ${lines.length} employees (${period})`,
    });
  }
  return { snapshot: await getHrSnapshotForContext(ctx, operatorId), created: lines.length };
}

export async function updateHrSettings(ctx: ServerContext, patch: Partial<HrSettings>) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
  await prisma.hrSetting.update({
    where: { id: settingsId(ctx) },
    data: patch,
  });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "hr_settings_updated",
    entityType: "settings",
    entityId: settingsId(ctx),
    summary: "HR settings updated",
    payload: patch,
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function resetHrDemo(ctx: ServerContext) {
  const { operatorId, employee: operator } = await resolveHrOperator(true);
  assertManager(operator);
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
  const { hashPassword: hash } = await import("@/server/revenue/password");
  await prisma.hrCredential.createMany({
    data: await Promise.all(
      Object.entries(SEED_HR_PASSWORDS).map(async ([employeeId, password]) => ({
        employeeId,
        password: await hash(password),
      })),
    ),
  });
  await prisma.hrShift.createMany({ data: buildSeedShifts() });
  await prisma.hrLeaveRequest.createMany({
    data: buildSeedLeave().map((x) => ({ ...x, syncCrmAbsence: Boolean(x.syncCrmAbsence) })),
  });
  await prisma.hrAttendance.createMany({ data: buildSeedAttendance() });
  await prisma.hrPayrollLine.createMany({ data: buildSeedPayroll() });
  await writePlatformAudit({
    ctx,
    module: "hr",
    action: "hr_demo_reset",
    entityType: "hr_state",
    entityId: "seed",
    summary: "HR seed data reset",
    severity: "critical",
  });
  return getHrSnapshotForContext(ctx, operatorId);
}

export async function getHrOrgChart(ctx: ServerContext) {
  const { operatorId } = await resolveHrOperator();
  const snapshot = await getHrSnapshotForContext(ctx, operatorId);
  return {
    nodes: snapshot.employees,
    departments: snapshot.departments,
    kpis: computeHrKpis(snapshot.employees, snapshot.leaveRequests, snapshot.attendance, snapshot.payroll),
  };
}
