import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { writePlatformAudit } from "@/server/platform-audit";

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

export async function getQueuedNotifications(ctx: ServerContext, limit = 50) {
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      module: "notifications",
      action: "notification_queued",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows
    .map((r) => (r.payload as QueuedNotification | null))
    .filter(Boolean) as QueuedNotification[];
}

/** Process queued notifications (cron / manual) — marks sent in audit */
export async function processNotificationQueue(ctx: ServerContext) {
  const pending = await getQueuedNotifications(ctx, 100);
  const sent: string[] = [];

  for (const n of pending.filter((x) => x.status === "queued")) {
    // Demo: log as sent; wire email/SMS provider in production
    await writePlatformAudit({
      ctx,
      module: "notifications",
      action: "notification_sent",
      entityType: "notification",
      entityId: n.id,
      summary: `Delivered ${n.channel} to ${n.recipient}`,
      payload: { ...n, status: "sent", sentAt: new Date().toISOString() },
    });
    sent.push(n.id);
  }

  return { processed: sent.length, ids: sent };
}

export async function notifyAppointmentReminder(
  ctx: ServerContext,
  input: { patientName: string; phone: string; time: string; visitId: string },
) {
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
