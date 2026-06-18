/** Sync HR leave/absence → CRM agent availability + lead transfer (DB-backed) */

import { clearCrmAbsenceAction, transferCrmAbsenceAction } from "@/server/crm/actions";

export async function syncCrmAbsenceForEmployee(
  crmAgentId: string,
  until: string,
  reason: string,
  transferLeads: boolean,
): Promise<{ transferred: number }> {
  return transferCrmAbsenceAction({ crmAgentId, until, reason, transferLeads });
}

export async function clearCrmAbsenceForEmployee(crmAgentId: string): Promise<void> {
  await clearCrmAbsenceAction(crmAgentId);
}
