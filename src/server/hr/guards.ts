import { HR_MANAGER_ID } from "@/design-system/hr-data";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";

export function isHrManager(employee: { id: string; role: string }) {
  return employee.id === HR_MANAGER_ID || employee.role === "manager";
}

export function assertManager(employee: { id: string; role: string }) {
  if (!isHrManager(employee)) {
    throw new ServerActionError("FORBIDDEN", "HR manager access required.");
  }
}

export async function requireEmployeeInBranch(ctx: ServerContext, employeeId: string) {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, branchId: ctx.branchId },
  });
  if (!employee) {
    throw new ServerActionError("NOT_FOUND", "Employee not found in this branch.");
  }
  return employee;
}

export function assertLeaveAccess(
  isManager: boolean,
  operatorId: string,
  targetEmployeeId: string,
) {
  if (!isManager && targetEmployeeId !== operatorId) {
    throw new ServerActionError("FORBIDDEN", "You can only manage your own leave requests.");
  }
}
