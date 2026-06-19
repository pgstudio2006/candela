import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { writePlatformAudit } from "@/server/platform-audit";
import { deliverNotification } from "@/server/notification-delivery";

export type NotificationChannel = "email" | "sms" | "whatsapp" | "in_app";

export type QueuedNotification = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  module: string;
  entityId?: string;
  scheduledAt: string;
  status: "queued" | "sent" | "failed";
};

/** Queue notification via audit trail (no extra schema migration) */
export async function queueNotification(
  ctx: ServerContext,
  input: Omit<QueuedNotification, "id" | "status" | "scheduledAt">,
) {
  const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: QueuedNotification = {
    ...input,
    id,
    status: "queued",
    scheduledAt: new Date().toISOString(),
  };

  await writePlatformAudit({
    ctx,
    module: "notifications",
    action: "notification_queued",
    entityType: "notification",
    entityId: id,
    summary: `${input.channel} → ${input.recipient}: ${input.subject}`,
    payload: record,
  });

  return record;
}

async function getSentNotificationIds(ctx: ServerContext): Promise<Set<string>> {
  const sent = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      module: "notifications",
      action: "notification_sent",
    },
    select: { entityId: true },
    take: 500,
  });
  return new Set(sent.map((r) => r.entityId));
}

export async function getQueuedNotifications(ctx: ServerContext, limit = 50) {
  const sentIds = await getSentNotificationIds(ctx);
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      module: "notifications",
      action: "notification_queued",
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  });

  return rows
    .map((r) => (r.payload as QueuedNotification | null))
    .filter((n): n is QueuedNotification => Boolean(n))
    .filter((n) => n.status === "queued" && !sentIds.has(n.id))
    .slice(0, limit);
}

/** Process queued notifications — delivers via configured providers */
export async function processNotificationQueue(ctx: ServerContext) {
  const pending = await getQueuedNotifications(ctx, 100);
  const sent: string[] = [];
  const failed: string[] = [];

  for (const n of pending) {
    const result = await deliverNotification(n);
    const status = result.ok ? "sent" : "failed";

    await writePlatformAudit({
      ctx,
      module: "notifications",
      action: result.ok ? "notification_sent" : "notification_failed",
      entityType: "notification",
      entityId: n.id,
      summary: result.ok
        ? `Delivered ${n.channel} to ${n.recipient}`
        : `Failed ${n.channel} to ${n.recipient}: ${result.detail ?? "unknown"}`,
      payload: {
        ...n,
        status,
        sentAt: new Date().toISOString(),
        provider: result.provider,
        detail: result.detail,
      },
    });

    if (result.ok) sent.push(n.id);
    else failed.push(n.id);
  }

  return { processed: sent.length, failed: failed.length, ids: sent, failedIds: failed };
}

/** Cron-safe: process all tenants when no session context */
export async function processAllTenantNotifications() {
  const tenants = await prisma.tenant.findMany({ where: { active: true } });
  let total = 0;

  for (const tenant of tenants) {
    const branch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, active: true },
    });
    if (!branch) continue;

    const ctx: ServerContext = {
      userId: "system_cron",
      tenantId: tenant.id,
      branchId: branch.id,
      role: "admin",
      sessionToken: "",
    };

    const result = await processNotificationQueue(ctx);
    total += result.processed;
  }

  return { tenants: tenants.length, processed: total };
}

export async function notifyAppointmentReminder(
  ctx: ServerContext,
  input: { patientName: string; phone: string; time: string; visitId: string },
) {
  if (!input.phone?.trim()) return null;
  return queueNotification(ctx, {
    channel: "whatsapp",
    recipient: input.phone,
    subject: "Appointment reminder",
    body: `Hi ${input.patientName}, your appointment at Navayu is at ${input.time}. Reply YES to confirm.`,
    module: "frontdesk",
    entityId: input.visitId,
  });
}

export async function notifyLeaveApproval(
  ctx: ServerContext,
  input: { employeeEmail: string; employeeName: string; approved: boolean },
) {
  return queueNotification(ctx, {
    channel: "email",
    recipient: input.employeeEmail,
    subject: input.approved ? "Leave approved" : "Leave rejected",
    body: `${input.employeeName}, your leave request has been ${input.approved ? "approved" : "rejected"}.`,
    module: "hr",
  });
}

export async function notifyLowStock(
  ctx: ServerContext,
  input: { drugName: string; qty: number; threshold: number },
) {
  return queueNotification(ctx, {
    channel: "in_app",
    recipient: "pharmacy@navayu.in",
    subject: "Low stock alert",
    body: `${input.drugName} is at ${input.qty} units (threshold ${input.threshold}).`,
    module: "pharmacy",
  });
}
