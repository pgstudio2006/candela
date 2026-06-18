import type {
  CrmAgent,
  CrmAssignmentRule,
  CrmFollowUp,
  CrmIntegration,
  CrmLead,
  CrmLeadSource,
  CrmPipelineStage,
} from "@/design-system/crm-data";

export type AgentKpi = {
  agentId: string;
  agentName: string;
  openLeads: number;
  contactedToday: number;
  conversions: number;
  conversionRate: number;
  avgResponseMin: number;
  followUpsDue: number;
  pipelineValue: number;
  slaBreaches: number;
};

export type CrmWorkspaceKpis = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
}[];

export type AgentDistributionStat = {
  agentId: string;
  agentName: string;
  targetPercent: number;
  actualPercent: number;
  openLeads: number;
  available: boolean;
};

let roundRobinIndex = 0;

export function isAgentAvailable(agent: CrmAgent, at = new Date()): boolean {
  if (!agent.active) return false;
  if (agent.unavailableUntil && new Date(agent.unavailableUntil) > at) return false;
  return true;
}

function openLeadCount(agentId: string, leads: CrmLead[]): number {
  return leads.filter((l) => l.assigneeId === agentId && !["won", "lost"].includes(l.stageId)).length;
}

function hasCapacity(agent: CrmAgent, leads: CrmLead[]): boolean {
  return openLeadCount(agent.id, leads) < agent.maxOpenLeads;
}

function eligibleAgents(ids: string[], agents: CrmAgent[], leads: CrmLead[]): CrmAgent[] {
  return ids
    .map((id) => agents.find((a) => a.id === id))
    .filter((a): a is CrmAgent => Boolean(a && isAgentAvailable(a) && hasCapacity(a, leads)));
}

export function assignLead(
  lead: Pick<CrmLead, "source" | "specialty">,
  rules: CrmAssignmentRule[],
  agents: CrmAgent[],
  leads: CrmLead[] = [],
): string | undefined {
  const activeRules = rules.filter((r) => r.active);
  for (const rule of activeRules) {
    if (rule.strategy === "by_source" && rule.source === lead.source) {
      return pickAgent(rule.assignToAgentIds, agents, leads);
    }
    if (rule.strategy === "by_specialty" && rule.specialty && lead.specialty === rule.specialty) {
      return pickAgent(rule.assignToAgentIds, agents, leads);
    }
    if (rule.strategy === "percentage") {
      return pickPercentage(rule, agents, leads);
    }
  }
  const rr = activeRules.find((r) => r.strategy === "round_robin");
  if (rr) return pickRoundRobin(rr.assignToAgentIds, agents, leads);
  const pct = activeRules.find((r) => r.strategy === "percentage");
  if (pct) return pickPercentage(pct, agents, leads);
  const counsellors = agents.filter((a) => a.role !== "manager" && isAgentAvailable(a) && hasCapacity(a, leads));
  return counsellors[0]?.id;
}

function pickAgent(ids: string[], agents: CrmAgent[], leads: CrmLead[]): string | undefined {
  const eligible = eligibleAgents(ids, agents, leads);
  return eligible[0]?.id;
}

function pickRoundRobin(ids: string[], agents: CrmAgent[], leads: CrmLead[]): string | undefined {
  const eligible = eligibleAgents(ids, agents, leads);
  if (!eligible.length) return undefined;
  const id = eligible[roundRobinIndex % eligible.length].id;
  roundRobinIndex += 1;
  return id;
}

function pickPercentage(rule: CrmAssignmentRule, agents: CrmAgent[], leads: CrmLead[]): string | undefined {
  const eligible = eligibleAgents(rule.assignToAgentIds, agents, leads);
  if (!eligible.length) return undefined;

  const weights = rule.agentWeights ?? {};
  const totalWeight = eligible.reduce((s, a) => s + (weights[a.id] ?? a.leadWeightPercent ?? 0), 0) || eligible.length;

  const openInPool = leads.filter(
    (l) =>
      !["won", "lost"].includes(l.stageId) &&
      l.assigneeId &&
      rule.assignToAgentIds.includes(l.assigneeId),
  );

  let best = eligible[0];
  let bestGap = -Infinity;

  for (const agent of eligible) {
    const weight = weights[agent.id] ?? agent.leadWeightPercent ?? 100 / eligible.length;
    const targetShare = weight / totalWeight;
    const actualShare =
      openInPool.length > 0
        ? openInPool.filter((l) => l.assigneeId === agent.id).length / openInPool.length
        : 0;
    const gap = targetShare - actualShare;
    if (gap > bestGap) {
      bestGap = gap;
      best = agent;
    }
  }

  return best.id;
}

export function computeLeadDistribution(
  rule: CrmAssignmentRule,
  agents: CrmAgent[],
  leads: CrmLead[],
): AgentDistributionStat[] {
  const weights = rule.agentWeights ?? {};
  const ids = rule.assignToAgentIds;
  const openInPool = leads.filter(
    (l) => !["won", "lost"].includes(l.stageId) && l.assigneeId && ids.includes(l.assigneeId),
  );
  const totalOpen = openInPool.length || 1;
  const totalWeight = ids.reduce((s, id) => {
    const a = agents.find((x) => x.id === id);
    return s + (weights[id] ?? a?.leadWeightPercent ?? 0);
  }, 0) || ids.length;

  return ids.map((id) => {
    const agent = agents.find((a) => a.id === id);
    const target = weights[id] ?? agent?.leadWeightPercent ?? 100 / ids.length;
    const open = openInPool.filter((l) => l.assigneeId === id).length;
    return {
      agentId: id,
      agentName: agent?.name ?? id,
      targetPercent: Math.round((target / totalWeight) * 100),
      actualPercent: Math.round((open / totalOpen) * 100),
      openLeads: openLeadCount(id, leads),
      available: agent ? isAgentAvailable(agent) && hasCapacity(agent, leads) : false,
    };
  });
}

export function pickTransferTarget(
  fromAgentId: string,
  agents: CrmAgent[],
  leads: CrmLead[],
  rules: CrmAssignmentRule[],
): string | undefined {
  const from = agents.find((a) => a.id === fromAgentId);
  if (from?.backupAgentId) {
    const backup = agents.find((a) => a.id === from.backupAgentId);
    if (backup && isAgentAvailable(backup) && hasCapacity(backup, leads)) return backup.id;
  }
  const pctRule = rules.find((r) => r.active && r.strategy === "percentage");
  if (pctRule) {
    const eligible = eligibleAgents(
      pctRule.assignToAgentIds.filter((id) => id !== fromAgentId),
      agents,
      leads,
    );
    if (eligible.length) return pickPercentage({ ...pctRule, assignToAgentIds: eligible.map((a) => a.id) }, agents, leads);
  }
  const fallback = agents.find(
    (a) => a.id !== fromAgentId && a.role !== "manager" && isAgentAvailable(a) && hasCapacity(a, leads),
  );
  return fallback?.id;
}

export function computeWorkspaceKpis(
  leads: CrmLead[],
  integrations: CrmIntegration[],
  followUps: CrmFollowUp[],
): CrmWorkspaceKpis {
  const today = new Date().toISOString().slice(0, 10);
  const newToday = leads.filter((l) => l.createdAt.startsWith(today)).length;
  const won = leads.filter((l) => l.stageId === "won").length;
  const open = leads.filter((l) => !["won", "lost"].includes(l.stageId)).length;
  const fromIntegrations = integrations.filter((i) => i.connected).reduce((s, i) => s + i.leadsToday, 0);
  const overdueFu = followUps.filter((f) => f.status === "pending" && f.scheduledAt < new Date().toISOString()).length;

  return [
    { label: "New leads today", value: String(Math.max(newToday, fromIntegrations)), delta: "From all connected sources", trend: "up" },
    { label: "Open pipeline", value: String(open), delta: "Active opportunities", trend: "neutral" },
    { label: "Won (all time)", value: String(won), delta: "Converted to package", trend: "up" },
    { label: "Integrations live", value: String(integrations.filter((i) => i.connected).length), delta: "WhatsApp · Forms · Web", trend: "neutral" },
    { label: "Follow-ups overdue", value: String(overdueFu), delta: "Needs action", trend: overdueFu ? "down" : "neutral" },
    { label: "Pipeline value", value: `₹${(leads.filter((l) => !["won", "lost"].includes(l.stageId)).reduce((s, l) => s + l.valueEstimate, 0) / 100000).toFixed(1)}L`, delta: "Estimated", trend: "up" },
  ];
}

export function computeAgentKpis(
  agentId: string,
  agentName: string,
  leads: CrmLead[],
  followUps: CrmFollowUp[],
  stages: CrmPipelineStage[],
): AgentKpi {
  const mine = leads.filter((l) => l.assigneeId === agentId);
  const open = mine.filter((l) => !["won", "lost"].includes(l.stageId));
  const won = mine.filter((l) => l.stageId === "won");
  const today = new Date().toISOString().slice(0, 10);
  const contactedToday = mine.filter((l) => l.lastContactAt?.startsWith(today)).length;
  const fuDue = followUps.filter((f) => f.assigneeId === agentId && f.status === "pending").length;
  const newStage = stages.find((s) => s.id === "new");
  const slaBreaches = open.filter((l) => {
    if (l.stageId !== "new" || !newStage?.slaHours) return false;
    const ageH = (Date.now() - new Date(l.createdAt).getTime()) / 3600000;
    return ageH > newStage.slaHours;
  }).length;

  return {
    agentId,
    agentName,
    openLeads: open.length,
    contactedToday,
    conversions: won.length,
    conversionRate: mine.length ? Math.round((won.length / mine.length) * 100) : 0,
    avgResponseMin: 18 + Math.floor(Math.random() * 20),
    followUpsDue: fuDue,
    pipelineValue: open.reduce((s, l) => s + l.valueEstimate, 0),
    slaBreaches,
  };
}

export function mapIntegrationToSource(integrationId: CrmIntegration["id"]): CrmLeadSource {
  switch (integrationId) {
    case "whatsapp_business":
      return "whatsapp";
    case "google_forms":
      return "google_forms";
    case "meta_lead_ads":
      return "meta_ads";
    case "website_widget":
      return "website";
    default:
      return "website";
  }
}

export function simulateInboundLead(
  integrationId: CrmIntegration["id"],
  payload: { name: string; phone: string; specialty?: string; notes?: string },
): Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "stageId" | "assigneeId"> {
  return {
    fullName: payload.name,
    phone: payload.phone,
    source: mapIntegrationToSource(integrationId),
    sourceDetail: `Inbound via ${integrationId.replace(/_/g, " ")}`,
    integrationId,
    specialty: payload.specialty ?? "spine",
    valueEstimate: 75000,
    priority: "medium",
    tags: ["inbound"],
    notes: payload.notes ?? "",
  };
}
