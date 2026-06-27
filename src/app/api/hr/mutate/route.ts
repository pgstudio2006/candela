import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveHrOperator } from "@/server/module-operator";
import { serializeForClient } from "@/server/serialize";
import { throwIfPrismaError } from "@/server/prisma-errors";
import { ServerActionError } from "@/server/errors";
import {
  addEmployee as addEmployeeCore,
  addLeaveRequest as addLeaveRequestCore,
  addShift as addShiftCore,
  approveLeave as approveLeaveCore,
  cancelLeaveRequest as cancelLeaveRequestCore,
  checkoutAttendance as checkoutAttendanceCore,
  copyShiftsFromPreviousWeek as copyShiftsFromPreviousWeekCore,
  generatePayrollRun as generatePayrollRunCore,
  markAttendance as markAttendanceCore,
  markPayrollPaid as markPayrollPaidCore,
  processPayroll as processPayrollCore,
  removeShift as removeShiftCore,
  setEmployeePassword as setEmployeePasswordCore,
  updateEmployee as updateEmployeeCore,
  updateHrSettings as updateHrSettingsCore,
  updateShift as updateShiftCore,
  type HrSettings,
} from "@/server/hr/index";
import type { HrAttendanceRecord, HrEmployee, HrLeaveRequest, HrShiftSlot } from "@/design-system/hr-data";

type ActionBody = {
  op: string;
  // addEmployee
  employee?: Omit<HrEmployee, "id">;
  password?: string;
  // setEmployeePassword
  employeeId?: string;
  // updateEmployee
  id?: string;
  patch?: Partial<HrEmployee> | Partial<HrShiftSlot> | Partial<HrSettings>;
  // shift ops
  shift?: Omit<HrShiftSlot, "id">;
  // leave ops
  leaveReq?: Omit<HrLeaveRequest, "id" | "status" | "requestedAt">;
  approved?: boolean;
  // attendance
  attendance?: Omit<HrAttendanceRecord, "id">;
  date?: string;
  // payroll
  period?: string;
  // settings
  settingsPatch?: Partial<HrSettings>;
  // copy shifts
  targetDate?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { op } = body;
    let result: unknown;

    switch (op) {
      case "addEmployee": {
        const { ctx } = await resolveHrOperator(true);
        result = await addEmployeeCore(ctx, body.employee!, body.password);
        break;
      }
      case "setEmployeePassword": {
        const { ctx } = await resolveHrOperator(true);
        result = await setEmployeePasswordCore(ctx, body.employeeId!, body.password!);
        break;
      }
      case "updateEmployee": {
        const { ctx } = await resolveHrOperator(true);
        result = await updateEmployeeCore(ctx, body.id!, body.patch as Partial<HrEmployee>);
        break;
      }
      case "addShift": {
        const { ctx } = await resolveHrOperator();
        result = await addShiftCore(ctx, body.shift!);
        break;
      }
      case "updateShift": {
        const { ctx } = await resolveHrOperator(true);
        result = await updateShiftCore(ctx, body.id!, body.patch as Partial<HrShiftSlot>);
        break;
      }
      case "removeShift": {
        const { ctx } = await resolveHrOperator(true);
        result = await removeShiftCore(ctx, body.id!);
        break;
      }
      case "copyShiftsFromPreviousWeek": {
        const { ctx } = await resolveHrOperator(true);
        result = await copyShiftsFromPreviousWeekCore(ctx, body.targetDate!);
        break;
      }
      case "addLeaveRequest": {
        const { ctx } = await resolveHrOperator();
        result = await addLeaveRequestCore(ctx, body.leaveReq!);
        break;
      }
      case "cancelLeaveRequest": {
        const { ctx } = await resolveHrOperator();
        result = await cancelLeaveRequestCore(ctx, body.id!);
        break;
      }
      case "approveLeave": {
        const { ctx } = await resolveHrOperator(true);
        result = await approveLeaveCore(ctx, body.id!, body.approved!);
        break;
      }
      case "markAttendance": {
        const { ctx } = await resolveHrOperator();
        result = await markAttendanceCore(ctx, body.attendance!);
        break;
      }
      case "checkoutAttendance": {
        const { ctx } = await resolveHrOperator();
        result = await checkoutAttendanceCore(ctx, body.employeeId!, body.date!);
        break;
      }
      case "processPayroll": {
        const { ctx } = await resolveHrOperator(true);
        result = await processPayrollCore(ctx, body.period!);
        break;
      }
      case "markPayrollPaid": {
        const { ctx } = await resolveHrOperator(true);
        result = await markPayrollPaidCore(ctx, body.period!);
        break;
      }
      case "generatePayrollRun": {
        const { ctx } = await resolveHrOperator(true);
        result = await generatePayrollRunCore(ctx, body.period!);
        break;
      }
      case "updateHrSettings": {
        const { ctx } = await resolveHrOperator(true);
        result = await updateHrSettingsCore(ctx, body.settingsPatch!);
        break;
      }
      default:
        return NextResponse.json({ ok: false, error: `Unknown operation: ${op}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: serializeForClient(result) });
  } catch (error) {
    try {
      throwIfPrismaError(error);
    } catch (mapped) {
      if (mapped instanceof ServerActionError) {
        return NextResponse.json({ ok: false, error: mapped.message }, { status: 400 });
      }
    }
    if (error instanceof ServerActionError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
