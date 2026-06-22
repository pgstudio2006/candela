"use server";

import type {
  HrAttendanceRecord,
  HrEmployee,
  HrLeaveRequest,
  HrPayrollLine,
  HrShiftSlot,
} from "@/design-system/hr-data";
import { resolveHrOperator } from "@/server/module-operator";
import { runAction, type ActionResult } from "@/server/action-result";
import {
  addEmployee as addEmployeeCore,
  addLeaveRequest as addLeaveRequestCore,
  addShift as addShiftCore,
  approveLeave as approveLeaveCore,
  cancelLeaveRequest as cancelLeaveRequestCore,
  checkoutAttendance as checkoutAttendanceCore,
  copyShiftsFromPreviousWeek as copyShiftsFromPreviousWeekCore,
  generatePayrollRun as generatePayrollRunCore,
  getHrOrgChart as getHrOrgChartCore,
  getHrSnapshotForContext,
  listHrAuditLogs,
  markAttendance as markAttendanceCore,
  markPayrollPaid as markPayrollPaidCore,
  processPayroll as processPayrollCore,
  removeShift as removeShiftCore,
  resetHrDemo as resetHrDemoCore,
  setEmployeePassword as setEmployeePasswordCore,
  updateEmployee as updateEmployeeCore,
  updateHrSettings as updateHrSettingsCore,
  updateShift as updateShiftCore,
  validateHrLogin,
  type HrLoginResult,
  type HrSettings,
  type HrSnapshot,
} from "@/server/hr/index";

export type { HrLoginResult, HrSettings, HrSnapshot };

export async function validateHrLoginAction(email: string, password: string): Promise<HrLoginResult> {
  return validateHrLogin(email, password);
}

export async function getHrSnapshot(_operatorId = ""): Promise<ActionResult<HrSnapshot>> {
  return runAction(async () => {
    const { ctx, operatorId } = await resolveHrOperator();
    return getHrSnapshotForContext(ctx, operatorId);
  });
}

export async function listHrAuditLogsAction(input?: { limit?: number; cursor?: string }) {
  const { ctx } = await resolveHrOperator(true);
  return listHrAuditLogs(ctx, input ?? {});
}

export async function addEmployee(
  input: Omit<HrEmployee, "id">,
  _operatorId: string,
  password?: string,
) {
  const { ctx } = await resolveHrOperator(true);
  return addEmployeeCore(ctx, input, password);
}

export async function setEmployeePasswordAction(
  employeeId: string,
  password: string,
  _operatorId: string,
) {
  const { ctx, operatorId } = await resolveHrOperator(true);
  return setEmployeePasswordCore(ctx, employeeId, password);
}

export async function updateEmployee(id: string, patch: Partial<HrEmployee>, _operatorId: string) {
  const { ctx, operatorId } = await resolveHrOperator(true);
  return updateEmployeeCore(ctx, id, patch);
}

export async function copyShiftsFromPreviousWeek(targetDate: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return copyShiftsFromPreviousWeekCore(ctx, targetDate);
}

export async function addShift(input: Omit<HrShiftSlot, "id">, _operatorId: string) {
  const { ctx } = await resolveHrOperator();
  return addShiftCore(ctx, input);
}

export async function removeShift(id: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return removeShiftCore(ctx, id);
}

export async function updateShift(id: string, patch: Partial<HrShiftSlot>, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return updateShiftCore(ctx, id, patch);
}

export async function addLeaveRequest(
  input: Omit<HrLeaveRequest, "id" | "status" | "requestedAt">,
  _operatorId: string,
) {
  const { ctx } = await resolveHrOperator();
  return addLeaveRequestCore(ctx, input);
}

export async function cancelLeaveRequest(id: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator();
  return cancelLeaveRequestCore(ctx, id);
}

export async function approveLeave(id: string, approved: boolean, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return approveLeaveCore(ctx, id, approved);
}

export async function markAttendance(input: Omit<HrAttendanceRecord, "id">, _operatorId: string) {
  const { ctx } = await resolveHrOperator();
  return markAttendanceCore(ctx, input);
}

export async function checkoutAttendance(employeeId: string, date: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator();
  return checkoutAttendanceCore(ctx, employeeId, date);
}

export async function processPayroll(period: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return processPayrollCore(ctx, period);
}

export async function markPayrollPaid(period: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return markPayrollPaidCore(ctx, period);
}

export async function generatePayrollRun(period: string, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return generatePayrollRunCore(ctx, period);
}

export async function updateHrSettings(patch: Partial<HrSettings>, _operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return updateHrSettingsCore(ctx, patch);
}

export async function resetHrDemo(_operatorId: string) {
  const { ctx } = await resolveHrOperator(true);
  return resetHrDemoCore(ctx);
}

export async function getHrOrgChart(_operatorId = "") {
  const { ctx, operatorId } = await resolveHrOperator();
  return getHrOrgChartCore(ctx);
}
