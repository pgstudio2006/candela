import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";

export type AdminStaffRole =
  | "super_admin"
  | "branch_admin"
  | "branch_manager"
  | "finance"
  | "finance_manager"
  | "mrd"
  | "viewer"
  | string;

export type AdminOperator = {
  operatorId: string;
  name: string;
  email: string;
  staffRole: AdminStaffRole;
  isSuperAdmin: boolean;
  canManageConfig: boolean;
  canManageFinance: boolean;
  isViewer: boolean;
};

const CONFIG_ROLES = new Set(["super_admin", "branch_admin", "branch_manager"]);
const FINANCE_ROLES = new Set(["super_admin", "branch_admin", "finance", "finance_manager"]);

export function buildAdminOperator(input: {
  operatorId: string;
  name: string;
  email: string;
  staffRole: AdminStaffRole;
}): AdminOperator {
  const { staffRole } = input;
  return {
    ...input,
    isSuperAdmin: staffRole === "super_admin",
    canManageConfig: CONFIG_ROLES.has(staffRole),
    canManageFinance: FINANCE_ROLES.has(staffRole),
    isViewer: staffRole === "viewer",
  };
}

export function assertNotViewer(operator: AdminOperator) {
  if (operator.isViewer) {
    throw new ServerActionError("FORBIDDEN", "Viewer accounts cannot modify admin data.");
  }
}

export function assertConfigAccess(operator: AdminOperator) {
  assertNotViewer(operator);
  if (!operator.canManageConfig) {
    throw new ServerActionError("FORBIDDEN", "Configuration access required.");
  }
}

export function assertFinanceAccess(operator: AdminOperator) {
  assertNotViewer(operator);
  if (!operator.canManageFinance) {
    throw new ServerActionError("FORBIDDEN", "Finance access required.");
  }
}

export async function requireStaffInBranch(ctx: ServerContext, staffId: string) {
  const staff = await prisma.adminStaff.findFirst({
    where: { id: staffId, branchId: ctx.branchId },
  });
  if (!staff) {
    throw new ServerActionError("NOT_FOUND", "Staff member not found in this branch.");
  }
  return staff;
}
