import type { CrmFollowUp, CrmLead } from "@/design-system/crm-data";

/** Demo seed IDs shipped in early builds — stripped on load for production workspaces */
export const DEMO_FOLLOWUP_IDS = new Set(["fu_1", "fu_2", "fu_3"]);

export function stripDemoFollowUps(followUps: CrmFollowUp[]): CrmFollowUp[] {
  return followUps.filter((f) => !DEMO_FOLLOWUP_IDS.has(f.id));
}

export function earliestPendingFollowUpAt(leadId: string, followUps: CrmFollowUp[]): string | undefined {
  const pending = followUps
    .filter((f) => f.leadId === leadId && f.status === "pending")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return pending[0]?.scheduledAt;
}

export function syncLeadNextFollowUpAt(leads: CrmLead[], followUps: CrmFollowUp[], leadId: string): CrmLead[] {
  const nextAt = earliestPendingFollowUpAt(leadId, followUps);
  const now = new Date().toISOString();
  return leads.map((l) =>
    l.id === leadId ? { ...l, nextFollowUpAt: nextAt, updatedAt: now } : l,
  );
}

export function followUpDisplayStatus(f: CrmFollowUp, now = new Date()): "pending" | "overdue" | "done" | "missed" {
  if (f.status === "done") return "done";
  if (f.status === "missed") return "missed";
  if (f.status === "pending" && f.scheduledAt < now.toISOString()) return "overdue";
  return "pending";
}

export function channelLabel(channel: CrmFollowUp["channel"]): string {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  return "Call";
}
