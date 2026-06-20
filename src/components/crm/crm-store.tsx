"use client";

import {
  DEFAULT_CRM_STAGES,
  SEED_ASSIGNMENT_RULES,
  SEED_CRM_AGENTS,
  SEED_CRM_FOLLOWUPS,
  SEED_CRM_ACTIVITIES,
  SEED_CRM_INTEGRATIONS,
  SEED_CRM_LEADS,
  type CrmActivity,
  type CrmAgent,
  type CrmAssignmentRule,
  type CrmFollowUp,
  type CrmIntegration,
  type CrmIntegrationId,
  type CrmLead,
  type CrmPipelineStage,
} from "@/design-system/crm-data";
import {
  assignLead,
  computeAgentKpis,
  computeLeadDistribution,
  computeWorkspaceKpis,
  pickTransferTarget,
  simulateInboundLead,
  type AgentDistributionStat,
  type AgentKpi,
} from "@/lib/crm-platform";
import { SEED_AGENT_PASSWORDS } from "@/lib/crm-auth";
import { parseActionError } from "@/lib/action-errors";
import { getCrmStateAction, saveCrmStateAction } from "@/server/crm/actions";
import { useSession } from "@/components/candela/session-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SESSION_KEY = "candela-session";
export const CRM_MANAGER_ID = "crm_mgr";

export type CrmState = {
  leads: CrmLead[];
  followUps: CrmFollowUp[];
  agents: CrmAgent[];
  agentPasswords: Record<string, string>;
  integrations: CrmIntegration[];
  stages: CrmPipelineStage[];
  rules: CrmAssignmentRule[];
  activities: CrmActivity[];
  /** Active workspace identity — set from login session */
  operatorId: string;
  /** Manager-only filter preview */
  viewAsAgentId: string | null;
};

type CrmStoreValue = CrmState & {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isManager: () => boolean;
  getOperator: () => CrmAgent | undefined;
  setOperator: (id: string) => void;
  getWorkspaceKpis: () => ReturnType<typeof computeWorkspaceKpis>;
  getMyKpis: () => AgentKpi | null;
  getAgentKpis: () => AgentKpi[];
  getFilteredLeads: () => CrmLead[];
  getFilteredFollowUps: () => CrmFollowUp[];
  addLead: (
    partial: Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "stageId" | "assigneeId"> &
      Partial<Pick<CrmLead, "stageId" | "assigneeId">>,
  ) => void;
  updateLead: (id: string, patch: Partial<CrmLead>) => void;
  assignLeadManual: (leadId: string, agentId: string) => void;
  moveLeadStage: (leadId: string, stageId: string) => void;
  ingestFromIntegration: (integrationId: CrmIntegrationId, payload: { name: string; phone: string; specialty?: string; notes?: string }) => void;
  toggleIntegration: (id: CrmIntegrationId, connected: boolean) => void;
  updateRule: (id: string, patch: Partial<CrmAssignmentRule>) => void;
  addRule: (rule: Omit<CrmAssignmentRule, "id">) => void;
  addAgent: (agent: Omit<CrmAgent, "id">, password?: string) => string;
  updateAgent: (id: string, patch: Partial<CrmAgent>) => void;
  setAgentPassword: (id: string, password: string) => void;
  getAgentPassword: (id: string) => string | undefined;
  removeAgent: (id: string) => void;
  updateStage: (id: string, patch: Partial<CrmPipelineStage>) => void;
  addStage: (label: string, color?: string) => void;
  removeStage: (id: string) => void;
  reorderStage: (id: string, dir: -1 | 1) => void;
  updateStages: (stages: CrmPipelineStage[]) => void;
  addFollowUp: (fu: Omit<CrmFollowUp, "id">) => void;
  completeFollowUp: (id: string, outcome: string) => void;
  setViewAsAgent: (agentId: string | null) => void;
  logActivity: (leadId: string, summary: string, type?: string) => void;
  getLeadDistribution: () => AgentDistributionStat[];
  markAgentUnavailable: (agentId: string, until: string, reason: string, transferLeads?: boolean) => void;
  clearAgentUnavailable: (agentId: string) => void;
  transferOpenLeads: (fromAgentId: string, toAgentId?: string) => number;
};

const CrmContext = createContext<CrmStoreValue | null>(null);

function operatorFromSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const session = JSON.parse(raw) as { role?: string; crmOperatorId?: string };
    if (session.role === "crm" && session.crmOperatorId) return session.crmOperatorId;
  } catch {
    /* ignore */
  }
  return "";
}

function loadCrmState(): CrmState {
  return {
    leads: structuredClone(SEED_CRM_LEADS),
    followUps: structuredClone(SEED_CRM_FOLLOWUPS),
    agents: structuredClone(SEED_CRM_AGENTS),
    agentPasswords: { ...SEED_AGENT_PASSWORDS },
    integrations: structuredClone(SEED_CRM_INTEGRATIONS),
    stages: structuredClone(DEFAULT_CRM_STAGES),
    rules: structuredClone(SEED_ASSIGNMENT_RULES),
    activities: structuredClone(SEED_CRM_ACTIVITIES),
    operatorId: operatorFromSession(),
    viewAsAgentId: null,
  };
}

async function persist(state: CrmState) {
  await saveCrmStateAction(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-crm-updated"));
  }
}

export function CrmStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [crm, setCrm] = useState<CrmState>(loadCrmState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false);
    try {
      const remote = await getCrmStateAction();
      const operatorId =
        (session?.role === "crm" && session.crmOperatorId) ||
        operatorFromSession() ||
        remote.operatorId ||
        "";
      setCrm({ ...remote, operatorId });
      setError(null);
    } catch (err) {
      setError(parseActionError(err).message);
    } finally {
      setReady(true);
    }
  }, [session?.crmOperatorId, session?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sync = useCallback((fn: (prev: CrmState) => CrmState) => {
    setCrm((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      void persist(next).catch((err) => {
        console.error("CRM save failed:", err);
        setError(parseActionError(err).message);
      });
      return next;
    });
  }, []);

  const setOperator = useCallback((id: string) => {
    setCrm((prev) => {
      if (prev.operatorId === id) return prev;
      const next = {
        ...prev,
        operatorId: id,
        viewAsAgentId: id && id !== CRM_MANAGER_ID ? id : null,
      };
      void persist(next);
      return next;
    });
  }, []);

  const value = useMemo<CrmStoreValue>(() => {
    const isManager = () => crm.operatorId === CRM_MANAGER_ID;
    const getOperator = () => crm.agents.find((a) => a.id === crm.operatorId);

    const filterAgentId = isManager() ? crm.viewAsAgentId : crm.operatorId;

    const getFilteredLeads = () => {
      if (!filterAgentId) return crm.leads;
      return crm.leads.filter((l) => l.assigneeId === filterAgentId);
    };

    const getFilteredFollowUps = () => {
      const leadIds = new Set(getFilteredLeads().map((l) => l.id));
      return crm.followUps.filter((f) => leadIds.has(f.leadId));
    };

    return {
      ...crm,
      ready,
      error,
      refresh,
      isManager,
      getOperator,
      setOperator,
      getWorkspaceKpis: () => {
        const leads = getFilteredLeads();
        return computeWorkspaceKpis(leads, crm.integrations, getFilteredFollowUps());
      },
      getMyKpis: () => {
        if (isManager() && !crm.viewAsAgentId) return null;
        const id = filterAgentId ?? CRM_MANAGER_ID;
        const agent = crm.agents.find((a) => a.id === id);
        if (!agent) return null;
        return computeAgentKpis(agent.id, agent.name, crm.leads, crm.followUps, crm.stages);
      },
      getAgentKpis: () =>
        crm.agents
          .filter((a) => a.role !== "manager")
          .map((a) => computeAgentKpis(a.id, a.name, crm.leads, crm.followUps, crm.stages)),
      getFilteredLeads,
      getFilteredFollowUps,
      addLead: (partial) => {
        const now = new Date().toISOString();
        sync((prev) => {
          const assigneeId =
            partial.assigneeId ?? assignLead(partial, prev.rules, prev.agents, prev.leads);
          const firstStage = [...prev.stages].sort((a, b) => a.order - b.order)[0]?.id ?? "new";
          const lead: CrmLead = {
            fullName: partial.fullName,
            phone: partial.phone,
            alternatePhone: partial.alternatePhone,
            email: partial.email,
            age: partial.age,
            gender: partial.gender,
            city: partial.city,
            district: partial.district,
            state: partial.state,
            country: partial.country,
            doctorName: partial.doctorName,
            appointmentDate: partial.appointmentDate,
            appointmentTime: partial.appointmentTime,
            appointmentCentre: partial.appointmentCentre,
            source: partial.source,
            sourceDetail: partial.sourceDetail,
            integrationId: partial.integrationId,
            specialty: partial.specialty,
            valueEstimate: partial.valueEstimate ?? 50000,
            priority: partial.priority ?? "medium",
            tags: partial.tags ?? [],
            notes: partial.notes ?? "",
            lostReason: partial.lostReason,
            id: `ld_${Date.now()}`,
            stageId: partial.stageId ?? firstStage,
            assigneeId,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...prev,
            leads: [lead, ...prev.leads],
            activities: [
              {
                id: `act_${Date.now()}`,
                leadId: lead.id,
                at: now,
                actor: getOperator()?.name ?? "CRM",
                type: "created",
                summary: `Lead created · ${lead.fullName} · assigned to ${prev.agents.find((a) => a.id === assigneeId)?.name ?? "unassigned"}`,
              },
              ...prev.activities,
            ].slice(0, 100),
          };
        });
      },
      updateLead: (id, patch) =>
        sync((prev) => ({
          ...prev,
          leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l)),
        })),
      assignLeadManual: (leadId, agentId) =>
        sync((prev) => {
          const agent = prev.agents.find((a) => a.id === agentId);
          const now = new Date().toISOString();
          return {
            ...prev,
            leads: prev.leads.map((l) => (l.id === leadId ? { ...l, assigneeId: agentId, updatedAt: now } : l)),
            activities: [
              {
                id: `act_${Date.now()}`,
                leadId,
                at: now,
                actor: getOperator()?.name ?? "Manager",
                type: "assigned",
                summary: `Reassigned to ${agent?.name ?? agentId}`,
              },
              ...prev.activities,
            ].slice(0, 100),
          };
        }),
      moveLeadStage: (leadId, stageId) =>
        sync((prev) => {
          const now = new Date().toISOString();
          const stage = prev.stages.find((s) => s.id === stageId);
          return {
            ...prev,
            leads: prev.leads.map((l) =>
              l.id === leadId ? { ...l, stageId, updatedAt: now, lastContactAt: now } : l,
            ),
            activities: [
              {
                id: `act_${Date.now()}`,
                leadId,
                at: now,
                actor: getOperator()?.name ?? "Agent",
                type: "stage",
                summary: `Moved to ${stage?.label ?? stageId}`,
              },
              ...prev.activities,
            ].slice(0, 100),
          };
        }),
      ingestFromIntegration: (integrationId, payload) => {
        const partial = simulateInboundLead(integrationId, payload);
        sync((prev) => {
          if (!prev.integrations.find((i) => i.id === integrationId)?.connected) return prev;
          const now = new Date().toISOString();
          const assigneeId = assignLead(partial, prev.rules, prev.agents, prev.leads);
          const firstStage = [...prev.stages].sort((a, b) => a.order - b.order)[0]?.id ?? "new";
          const lead: CrmLead = {
            ...partial,
            id: `ld_${Date.now()}`,
            stageId: firstStage,
            assigneeId,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...prev,
            leads: [lead, ...prev.leads],
            integrations: prev.integrations.map((i) =>
              i.id === integrationId ? { ...i, leadsToday: i.leadsToday + 1, lastEventAt: now } : i,
            ),
            activities: [
              {
                id: `act_${Date.now()}`,
                leadId: lead.id,
                at: now,
                actor: integrationId,
                type: "inbound",
                summary: `Inbound from ${integrationId}`,
              },
              ...prev.activities,
            ].slice(0, 100),
          };
        });
      },
      toggleIntegration: (id, connected) =>
        sync((prev) => ({
          ...prev,
          integrations: prev.integrations.map((i) => (i.id === id ? { ...i, connected } : i)),
        })),
      updateRule: (id, patch) =>
        sync((prev) => ({ ...prev, rules: prev.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      addRule: (rule) =>
        sync((prev) => ({ ...prev, rules: [...prev.rules, { ...rule, id: `rule_${Date.now()}` }] })),
      addAgent: (agent, password) => {
        const id = `ag_${Date.now().toString(36)}`;
        const pwd = password?.trim() || `welcome${Math.floor(1000 + Math.random() * 9000)}`;
        sync((prev) => ({
          ...prev,
          agents: [...prev.agents, { ...agent, id }],
          agentPasswords: { ...prev.agentPasswords, [id]: pwd },
        }));
        return pwd;
      },
      updateAgent: (id, patch) =>
        sync((prev) => ({
          ...prev,
          agents: prev.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      setAgentPassword: (id, password) =>
        sync((prev) => ({
          ...prev,
          agentPasswords: { ...prev.agentPasswords, [id]: password.trim() },
        })),
      getAgentPassword: (id) => crm.agentPasswords[id],
      removeAgent: (id) => {
        if (id === CRM_MANAGER_ID) return;
        sync((prev) => {
          const { [id]: _, ...restPasswords } = prev.agentPasswords;
          return {
            ...prev,
            agents: prev.agents.filter((a) => a.id !== id),
            agentPasswords: restPasswords,
            leads: prev.leads.map((l) => (l.assigneeId === id ? { ...l, assigneeId: undefined } : l)),
            followUps: prev.followUps.filter((f) => f.assigneeId !== id),
            operatorId: prev.operatorId === id ? operatorFromSession() : prev.operatorId,
            rules: prev.rules.map((r) => ({
              ...r,
              assignToAgentIds: r.assignToAgentIds.filter((aid) => aid !== id),
            })),
          };
        });
      },
      updateStage: (id, patch) =>
        sync((prev) => ({
          ...prev,
          stages: prev.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      addStage: (label, color = "#6366f1") =>
        sync((prev) => {
          const maxOrder = Math.max(...prev.stages.map((s) => s.order), -1);
          const slug =
            label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_|_$/g, "")
              .slice(0, 20) || "stage";
          const id = `st_${slug}_${Date.now().toString(36)}`;
          return {
            ...prev,
            stages: [...prev.stages, { id, label: label.trim(), color, order: maxOrder + 1 }],
          };
        }),
      removeStage: (id) =>
        sync((prev) => {
          const ordered = [...prev.stages].sort((a, b) => a.order - b.order);
          const idx = ordered.findIndex((s) => s.id === id);
          const fallback = ordered[idx - 1]?.id ?? ordered[idx + 1]?.id ?? ordered[0]?.id;
          if (!fallback || ordered.length <= 2) return prev;
          return {
            ...prev,
            stages: prev.stages.filter((s) => s.id !== id),
            leads: prev.leads.map((l) => (l.stageId === id ? { ...l, stageId: fallback } : l)),
          };
        }),
      reorderStage: (id, dir) =>
        sync((prev) => {
          const ordered = [...prev.stages].sort((a, b) => a.order - b.order);
          const idx = ordered.findIndex((s) => s.id === id);
          const swap = ordered[idx + dir];
          if (!swap) return prev;
          const next = ordered.map((s) => {
            if (s.id === id) return { ...s, order: swap.order };
            if (s.id === swap.id) return { ...s, order: ordered[idx].order };
            return s;
          });
          return { ...prev, stages: next };
        }),
      updateStages: (stages) => sync((prev) => ({ ...prev, stages: stages.sort((a, b) => a.order - b.order) })),
      addFollowUp: (fu) =>
        sync((prev) => ({ ...prev, followUps: [...prev.followUps, { ...fu, id: `fu_${Date.now()}` }] })),
      completeFollowUp: (id, outcome) =>
        sync((prev) => ({
          ...prev,
          followUps: prev.followUps.map((f) => (f.id === id ? { ...f, status: "done" as const, outcome } : f)),
        })),
      setViewAsAgent: (agentId) => sync((prev) => ({ ...prev, viewAsAgentId: agentId })),
      getLeadDistribution: () => {
        const pctRule = crm.rules.find((r) => r.active && r.strategy === "percentage") ?? crm.rules.find((r) => r.strategy === "percentage");
        if (!pctRule) return [];
        return computeLeadDistribution(pctRule, crm.agents, crm.leads);
      },
      markAgentUnavailable: (agentId, until, reason, transferLeads = true) => {
        sync((prev) => {
          const now = new Date().toISOString();
          let nextLeads = prev.leads;
          let nextActivities = prev.activities;
          if (transferLeads) {
            const toId = pickTransferTarget(agentId, prev.agents, prev.leads, prev.rules);
            if (toId) {
              const toAgent = prev.agents.find((a) => a.id === toId);
              let transferCount = 0;
              nextLeads = prev.leads.map((l) => {
                if (l.assigneeId !== agentId || ["won", "lost"].includes(l.stageId)) return l;
                transferCount += 1;
                return { ...l, assigneeId: toId, updatedAt: now };
              });
              if (transferCount > 0) {
                nextActivities = [
                  {
                    id: `act_${Date.now()}`,
                    leadId: "system",
                    at: now,
                    actor: getOperator()?.name ?? "Manager",
                    type: "transfer",
                    summary: `${transferCount} lead(s) transferred from ${prev.agents.find((a) => a.id === agentId)?.name} → ${toAgent?.name} (absence)`,
                  },
                  ...prev.activities,
                ].slice(0, 100);
              }
            }
          }
          return {
            ...prev,
            leads: nextLeads,
            activities: nextActivities,
            agents: prev.agents.map((a) =>
              a.id === agentId ? { ...a, unavailableUntil: until, unavailableReason: reason } : a,
            ),
          };
        });
      },
      clearAgentUnavailable: (agentId) =>
        sync((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === agentId ? { ...a, unavailableUntil: undefined, unavailableReason: undefined } : a,
          ),
        })),
      transferOpenLeads: (fromAgentId, toAgentId) => {
        let count = 0;
        sync((prev) => {
          const now = new Date().toISOString();
          const target = toAgentId ?? pickTransferTarget(fromAgentId, prev.agents, prev.leads, prev.rules);
          if (!target) return prev;
          const toAgent = prev.agents.find((a) => a.id === target);
          const fromAgent = prev.agents.find((a) => a.id === fromAgentId);
          const nextLeads = prev.leads.map((l) => {
            if (l.assigneeId !== fromAgentId || ["won", "lost"].includes(l.stageId)) return l;
            count += 1;
            return { ...l, assigneeId: target, updatedAt: now };
          });
          if (count === 0) return prev;
          return {
            ...prev,
            leads: nextLeads,
            activities: [
              {
                id: `act_${Date.now()}`,
                leadId: "system",
                at: now,
                actor: getOperator()?.name ?? "Manager",
                type: "transfer",
                summary: `Manager transferred ${count} lead(s) from ${fromAgent?.name} → ${toAgent?.name}`,
              },
              ...prev.activities,
            ].slice(0, 100),
          };
        });
        return count;
      },
      logActivity: (leadId, summary, type = "note") => {
        const now = new Date().toISOString();
        sync((prev) => ({
          ...prev,
          activities: [
            { id: `act_${Date.now()}`, leadId, at: now, actor: getOperator()?.name ?? "User", type, summary },
            ...prev.activities,
          ].slice(0, 100),
        }));
      },
    };
  }, [crm, ready, error, refresh, sync, setOperator]);

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrmStore() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrmStore must be used within CrmStoreProvider");
  return ctx;
}
