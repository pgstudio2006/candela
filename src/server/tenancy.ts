import type { ServerContext } from "@/server/context";

/** Prisma where fragment scoped to tenant + branch */
export function branchScope(ctx: ServerContext) {
  return {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
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
