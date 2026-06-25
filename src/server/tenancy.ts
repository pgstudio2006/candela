import type { ServerContext } from "@/server/context";

/** Prisma where fragment scoped to tenant + branch */
export function branchScope(ctx: ServerContext) {
  return {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
  };
}

/** Reads include unscoped rows for this tenant until backfill assigns branchId. */
export function branchClinicalWhere(ctx: ServerContext) {
  return {
    tenantId: ctx.tenantId,
    OR: [{ branchId: ctx.branchId }, { branchId: null }, { branchId: "" }],
  };
}

/** Admin registry — all patients in the tenant across branches. */
export function tenantClinicalWhere(ctx: ServerContext) {
  return {
    OR: [{ tenantId: ctx.tenantId }, { tenantId: null }, { tenantId: "" }],
  };
}

export function tenantScope(ctx: ServerContext) {
  return { tenantId: ctx.tenantId };
}

export function assertBranchAccess(ctx: ServerContext, branchId?: string | null) {
  if (branchId && branchId !== ctx.branchId) {
    throw new Error("Cross-branch access denied.");
  }
}
