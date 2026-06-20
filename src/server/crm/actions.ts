"use server";

import type {
  CrmAgent,
  CrmAssignmentRule,
  CrmFollowUp,
  CrmIntegrationId,
  CrmLead,
  CrmPipelineStage,
} from "@/design-system/crm-data";
import { prisma } from "@/lib/prisma";
import { requireAnyModule, requireModule } from "@/server/auth";
import { getServerContext } from "@/server/context";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { hashPassword, verifyPassword } from "@/server/revenue/password";
import type { CrmStateShape } from "@/server/revenue/state-seeds";
import {
  addAgent,
  addFollowUp,
  addRule,
  addStage,
  assignLeadManual,
  clearAgentUnavailable,
  clearCrmAbsence,
  completeFollowUp,
  createLead,
  getCrmLeadClinicalHistory,
  getCrmSnapshot,
  ingestFromIntegration,
  listCrmAuditLogs,
  logActivity,
  markAgentUnavailable,
  markMissedFollowUp,
  moveLeadStage,
  removeAgent,
  removeStage,
  reorderStage,
  rescheduleFollowUp,
  setAgentPassword,
  toggleIntegration,
  transferCrmAbsence,
  transferOpenLeads,
  updateAgent,
  updateLead,
  updateRule,
  updateStage,
  updateStages,
  type CrmPatientHistory,
} from "@/server/crm/index";

export type { CrmPatientHistory };

export type CrmLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export async function getCrmSnapshotAction(operatorId: string) {
  const ctx = await requireModule("crm");
  return getCrmSnapshot(ctx, operatorId);
}

/** @deprecated Use getCrmSnapshotAction */
export async function getCrmStateAction(): Promise<CrmStateShape> {
  const ctx = await requireModule("crm");
  const snap = await getCrmSnapshot(ctx, "");
  const { activeOperatorId: _a, activeOperatorName: _b, activeOperatorRole: _c, isManager: _d, ...state } = snap;
  return state;
}

export async function createLeadAction(
  operatorId: string,
  partial: Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "stageId" | "assigneeId"> &
    Partial<Pick<CrmLead, "stageId" | "assigneeId">>,
) {
  const ctx = await requireModule("crm");
  return createLead(ctx, operatorId, partial);
}

export async function updateLeadAction(operatorId: string, leadId: string, patch: Partial<CrmLead>) {
  const ctx = await requireModule("crm");
  return updateLead(ctx, operatorId, leadId, patch);
}

export async function assignLeadManualAction(operatorId: string, leadId: string, agentId: string) {
  const ctx = await requireModule("crm");
  return assignLeadManual(ctx, operatorId, leadId, agentId);
}

export async function moveLeadStageAction(operatorId: string, leadId: string, stageId: string) {
  const ctx = await requireModule("crm");
  return moveLeadStage(ctx, operatorId, leadId, stageId);
}

export async function ingestFromIntegrationAction(
  operatorId: string,
  integrationId: CrmIntegrationId,
  payload: { name: string; phone: string; specialty?: string; notes?: string },
) {
  const ctx = await requireModule("crm");
  return ingestFromIntegration(ctx, operatorId, integrationId, payload);
}

export async function toggleIntegrationAction(operatorId: string, id: CrmIntegrationId, connected: boolean) {
  const ctx = await requireModule("crm");
  return toggleIntegration(ctx, operatorId, id, connected);
}

export async function updateRuleAction(operatorId: string, id: string, patch: Partial<CrmAssignmentRule>) {
  const ctx = await requireModule("crm");
  return updateRule(ctx, operatorId, id, patch);
}

export async function addRuleAction(operatorId: string, rule: Omit<CrmAssignmentRule, "id">) {
  const ctx = await requireModule("crm");
  return addRule(ctx, operatorId, rule);
}

export async function addAgentAction(operatorId: string, agent: Omit<CrmAgent, "id">, password?: string) {
  const ctx = await requireModule("crm");
  return addAgent(ctx, operatorId, agent, password);
}

export async function updateAgentAction(operatorId: string, id: string, patch: Partial<CrmAgent>) {
  const ctx = await requireModule("crm");
  return updateAgent(ctx, operatorId, id, patch);
}

export async function setAgentPasswordAction(operatorId: string, id: string, password: string) {
  const ctx = await requireModule("crm");
  return setAgentPassword(ctx, operatorId, id, password);
}

export async function removeAgentAction(operatorId: string, id: string) {
  const ctx = await requireModule("crm");
  return removeAgent(ctx, operatorId, id);
}

export async function updateStageAction(operatorId: string, id: string, patch: Partial<CrmPipelineStage>) {
  const ctx = await requireModule("crm");
  return updateStage(ctx, operatorId, id, patch);
}

export async function addStageAction(operatorId: string, label: string, color?: string) {
  const ctx = await requireModule("crm");
  return addStage(ctx, operatorId, label, color);
}

export async function removeStageAction(operatorId: string, id: string) {
  const ctx = await requireModule("crm");
  return removeStage(ctx, operatorId, id);
}

export async function reorderStageAction(operatorId: string, id: string, dir: -1 | 1) {
  const ctx = await requireModule("crm");
  return reorderStage(ctx, operatorId, id, dir);
}

export async function updateStagesAction(operatorId: string, stages: CrmPipelineStage[]) {
  const ctx = await requireModule("crm");
  return updateStages(ctx, operatorId, stages);
}

export async function addFollowUpAction(
  operatorId: string,
  fu: Omit<CrmFollowUp, "id" | "status"> & { status?: CrmFollowUp["status"] },
) {
  const ctx = await requireModule("crm");
  return addFollowUp(ctx, operatorId, fu);
}

export async function completeFollowUpAction(operatorId: string, id: string, outcome: string) {
  const ctx = await requireModule("crm");
  return completeFollowUp(ctx, operatorId, id, outcome);
}

export async function rescheduleFollowUpAction(operatorId: string, id: string, scheduledAt: string, notes?: string) {
  const ctx = await requireModule("crm");
  return rescheduleFollowUp(ctx, operatorId, id, scheduledAt, notes);
}

export async function markMissedFollowUpAction(operatorId: string, id: string, reason?: string) {
  const ctx = await requireModule("crm");
  return markMissedFollowUp(ctx, operatorId, id, reason);
}

export async function markAgentUnavailableAction(
  operatorId: string,
  agentId: string,
  until: string,
  reason: string,
  transferLeads?: boolean,
) {
  const ctx = await requireModule("crm");
  return markAgentUnavailable(ctx, operatorId, agentId, until, reason, transferLeads);
}

export async function clearAgentUnavailableAction(operatorId: string, agentId: string) {
  const ctx = await requireModule("crm");
  return clearAgentUnavailable(ctx, operatorId, agentId);
}

export async function transferOpenLeadsAction(operatorId: string, fromAgentId: string, toAgentId?: string) {
  const ctx = await requireModule("crm");
  return transferOpenLeads(ctx, operatorId, fromAgentId, toAgentId);
}

export async function logActivityAction(operatorId: string, leadId: string, summary: string, type?: string) {
  const ctx = await requireModule("crm");
  return logActivity(ctx, operatorId, leadId, summary, type);
}

export async function listCrmAuditLogsAction(input?: { limit?: number; cursor?: string }) {
  const ctx = await requireModule("crm");
  return listCrmAuditLogs(ctx, input ?? {});
}

export async function getCrmLeadClinicalHistoryAction(lead: CrmLead): Promise<CrmPatientHistory> {
  await requireModule("crm");
  const ctx = await getServerContext();
  return getCrmLeadClinicalHistory(ctx, lead);
}

export async function transferCrmAbsenceAction(input: {
  crmAgentId: string;
  until: string;
  reason: string;
  transferLeads: boolean;
}): Promise<{ transferred: number }> {
  await requireAnyModule("crm", "hr");
  const ctx = await getServerContext();
  return transferCrmAbsence(ctx, input);
}

export async function clearCrmAbsenceAction(crmAgentId: string): Promise<void> {
  await requireAnyModule("crm", "hr");
  const ctx = await getServerContext();
  await clearCrmAbsence(ctx, crmAgentId);
}

export async function validateCrmLoginAction(email: string, password: string): Promise<CrmLoginResult> {
  await ensureRevenueSeeded();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter your work email and password." };

  const operator = await prisma.crmOperatorCredential.findUnique({
    where: { email: normalized },
  });
  if (!operator) {
    return {
      ok: false,
      error: "No CRM account found for this email. Ask your manager to add you under Team & routing.",
    };
  }
  if (!operator.active) return { ok: false, error: "This account is inactive. Contact your CRM manager." };
  if (!(await verifyPassword(pwd, operator.passwordHash))) return { ok: false, error: "Incorrect password." };
  return { ok: true, operatorId: operator.id, name: operator.name, email: operator.email };
}

export async function saveCrmWebhookConfigAction(input: {
  id: string;
  label: string;
  description: string;
  icon: string;
  connected: boolean;
  webhookUrl: string;
  headers?: Record<string, string>;
}) {
  await requireModule("crm");
  await ensureRevenueSeeded();
  await prisma.crmWebhookConfig.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      label: input.label,
      description: input.description,
      icon: input.icon,
      connected: input.connected,
      webhookUrl: input.webhookUrl,
      headers: input.headers ?? {},
    },
    update: {
      label: input.label,
      description: input.description,
      icon: input.icon,
      connected: input.connected,
      webhookUrl: input.webhookUrl,
      headers: input.headers ?? {},
    },
  });
}

/** @deprecated Bulk save removed — use granular mutation actions. Kept for legacy credential sync. */
export async function saveCrmStateAction(next: CrmStateShape): Promise<void> {
  await requireModule("crm");
  await ensureRevenueSeeded();
  await Promise.all(
    next.agents.map(async (agent) => {
      const explicitPassword = next.agentPasswords[agent.id]?.trim();
      const passwordFields = explicitPassword
        ? { passwordHash: await hashPassword(explicitPassword) }
        : {};
      return prisma.crmOperatorCredential.upsert({
        where: { id: agent.id },
        create: {
          id: agent.id,
          name: agent.name,
          email: agent.email.toLowerCase(),
          role: agent.role,
          active: agent.active,
          specialtyTags: agent.specialtyTags,
          maxOpenLeads: agent.maxOpenLeads,
          backupAgentId: agent.backupAgentId,
          leadWeightPct: agent.leadWeightPercent ?? 0,
          passwordHash: await hashPassword(explicitPassword || "welcome123"),
        },
        update: {
          name: agent.name,
          email: agent.email.toLowerCase(),
          role: agent.role,
          active: agent.active,
          specialtyTags: agent.specialtyTags,
          maxOpenLeads: agent.maxOpenLeads,
          backupAgentId: agent.backupAgentId,
          leadWeightPct: agent.leadWeightPercent ?? 0,
          ...passwordFields,
        },
      });
    }),
  );
}
