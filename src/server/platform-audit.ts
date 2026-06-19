import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { writeAuditLog } from "@/server/audit-log";

export type PlatformAuditInput = {
  ctx?: ServerContext;
  actor?: string;
  actorRole?: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  severity?: "info" | "warning" | "critical";
  payload?: unknown;
};

/** Writes to both AdminAuditLog and tenant AuditLog */
export async function writePlatformAudit(input: PlatformAuditInput) {
  const actor = input.ctx?.userId ?? input.actor ?? "system";
  const actorRole = input.ctx?.role ?? input.actorRole ?? "system";

  await writeAuditLog({
    actor,
    actorRole,
    module: input.module,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    severity: input.severity,
    payload: input.payload,
  });

  if (input.ctx?.tenantId) {
    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tenantId: input.ctx.tenantId,
        branchId: input.ctx.branchId,
        actorUserId: input.ctx.userId,
        actor,
        actorRole,
        module: input.module,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        severity: input.severity ?? "info",
        payload: input.payload as object | undefined,
      },
    });
  }
}
