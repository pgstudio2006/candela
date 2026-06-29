// @ts-nocheck
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actor?: string;
  actorRole?: string;
  tenantId?: string;
  branchId?: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  severity?: "info" | "warning" | "critical";
  payload?: unknown;
};

export async function writeAuditLog(input: AuditInput) {
  const db = prisma as any;
  await db.adminAuditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId ?? null,
      branchId: input.branchId ?? null,
      at: new Date().toISOString(),
      actor: input.actor ?? "System",
      actorRole: input.actorRole ?? "system",
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      severity: input.severity ?? "info",
      payload: input.payload as object | null | undefined,
    },
  });
}
