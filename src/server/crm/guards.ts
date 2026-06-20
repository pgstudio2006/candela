import type { CrmAgent } from "@/design-system/crm-data";
import { CRM_MANAGER_ID } from "@/lib/crm-auth";
import { ServerActionError } from "@/server/errors";
import type { CrmStateShape } from "@/server/revenue/state-seeds";
import { requireLead } from "@/lib/crm-state-mutations";

export { requireLead } from "@/lib/crm-state-mutations";

export function assertManager(operator: CrmAgent) {
  if (operator.id !== CRM_MANAGER_ID && operator.role !== "manager") {
    throw new ServerActionError("FORBIDDEN", "CRM manager access required.");
  }
}

export function assertLeadAccess(operator: CrmAgent, lead: { assigneeId?: string }, isManager: boolean) {
  if (isManager) return;
  if (lead.assigneeId !== operator.id) {
    throw new ServerActionError("FORBIDDEN", "You can only modify leads assigned to you.");
  }
}

export function requireAgent(state: CrmStateShape, agentId: string): CrmAgent {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) throw new ServerActionError("NOT_FOUND", "Agent not found.");
  return agent;
}

export function assertAssignableAgent(agent: CrmAgent) {
  if (!agent.active) {
    throw new ServerActionError("VALIDATION", "Cannot assign leads to an inactive agent.");
  }
}
