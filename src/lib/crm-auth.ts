import { SEED_CRM_AGENTS, type CrmAgent } from "@/design-system/crm-data";

export const CRM_MANAGER_ID = "crm_mgr";
export const CRM_MANAGER_EMAIL = "crm@navayu.in";

/** Default demo passwords for seed team members (agent id → password) */
export const SEED_AGENT_PASSWORDS: Record<string, string> = {
  ag_priya: "priya2026",
  ag_anita: "anita2026",
  ag_rahul: "rahul2026",
};

export function crmSeedAgents(): CrmAgent[] {
  return structuredClone(SEED_CRM_AGENTS);
}

export function generateAgentPassword(): string {
  return `welcome${Math.floor(1000 + Math.random() * 9000)}`;
}
