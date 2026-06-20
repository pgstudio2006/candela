"use server";

import { Prisma } from "@prisma/client";
import { formatStageStatus } from "@/lib/frontdesk-workflow";
import { prisma } from "@/lib/prisma";
import { readCounsellorWorkspace, readCrmWorkspace, readPharmacyWorkspace, writeCrmWorkspace } from "@/server/workspace-state";
import { requireAnyModule, requireModule } from "@/server/auth";
import { getServerContext } from "@/server/context";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { hashPassword, verifyPassword } from "@/server/revenue/password";
import {
  defaultCounsellorState,
  defaultCrmState,
  defaultPharmacyState,
  type CrmStateShape,
} from "@/server/revenue/state-seeds";
import type { CrmIntegration, CrmLead } from "@/design-system/crm-data";
import type { CounselSession } from "@/design-system/counsellor-data";
import type { PharmacyBill, Prescription } from "@/design-system/pharmacy-data";

export type CrmLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export type CrmPatientHistory = {
  matchType: "patient_id" | "phone" | "name" | "visit" | "none";
  patient:
    | {
        id: string;
        uhid: string;
        name: string;
        phone: string;
        age: number;
        gender: string;
        department?: string | null;
        referrer?: string | null;
        lastVisit?: string | null;
      }
    | undefined;
  visits: Array<{
    id: string;
    doctorName: string;
    stage: string;
    billing: string;
    token?: number;
    billAmount: number | null;
    amountPaid: number | null;
    balanceDue: number | null;
    counselPackageLabel?: string;
    deferredReason?: string;
  }>;
  pharmacyRx: Prescription[];
  pharmacyBills: PharmacyBill[];
  counselSessions: CounselSession[];
  crmActivities: CrmStateShape["activities"];
  followUps: CrmStateShape["followUps"];
  timeline: Array<{
    id: string;
    at: string;
    category: "crm" | "visit" | "billing" | "pharmacy" | "counselling" | "follow_up";
    title: string;
    detail: string;
    amount?: number;
    status?: string;
  }>;
  billing: {
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    visitCount: number;
    pharmacyTotal: number;
    pharmacyPaid: number;
  };
};

async function readState(): Promise<CrmStateShape> {
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  const state = await readCrmWorkspace(ctx, () => defaultCrmState({}));
  const configs = await prisma.crmWebhookConfig.findMany();
  state.integrations = configs.map((c) => ({
    id: c.id as CrmIntegration["id"],
    label: c.label,
    description: c.description,
    icon: c.icon as CrmIntegration["icon"],
    connected: c.connected,
    webhookUrl: c.webhookUrl,
    lastEventAt: c.lastEventAt ?? undefined,
    leadsToday: c.leadsToday,
  }));
  return state;
}

export async function getCrmStateAction(): Promise<CrmStateShape> {
  await requireModule("crm");
  return readState();
}

export async function saveCrmStateAction(next: CrmStateShape): Promise<void> {
  await requireModule("crm");
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  const { operatorId: _drop, ...payload } = next;
  await writeCrmWorkspace(ctx, payload);

  await Promise.all(
    next.integrations.map((integration) =>
      prisma.crmWebhookConfig.upsert({
        where: { id: integration.id },
        create: {
          id: integration.id,
          label: integration.label,
          description: integration.description,
          icon: integration.icon,
          connected: integration.connected,
          webhookUrl: integration.webhookUrl,
          lastEventAt: integration.lastEventAt ?? null,
          leadsToday: integration.leadsToday,
        },
        update: {
          label: integration.label,
          description: integration.description,
          icon: integration.icon,
          connected: integration.connected,
          webhookUrl: integration.webhookUrl,
          lastEventAt: integration.lastEventAt ?? null,
          leadsToday: integration.leadsToday,
        },
      }),
    ),
  );

  await Promise.all(
    next.agents.map(async (agent) =>
      prisma.crmOperatorCredential.upsert({
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
          passwordHash: await hashPassword(next.agentPasswords[agent.id] ?? "welcome123"),
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
          passwordHash: await hashPassword(next.agentPasswords[agent.id] ?? "welcome123"),
        },
      }),
    ),
  );
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
      ...input,
      headers: input.headers ?? Prisma.JsonNull,
      leadsToday: 0,
    },
    update: {
      ...input,
      headers: input.headers ?? Prisma.JsonNull,
    },
  });
}

function normalizePhone(input?: string) {
  return (input ?? "").replace(/\D/g, "").slice(-10);
}

function normalizeName(input?: string) {
  return (input ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getCrmLeadClinicalHistoryAction(lead: CrmLead): Promise<CrmPatientHistory> {
  await requireModule("crm");
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  const state = await readState();
  const pharmacyState = await readPharmacyWorkspace(ctx, () => defaultPharmacyState({}));
  const counsellorState = await readCounsellorWorkspace(ctx, defaultCounsellorState);

  const allPatients = await prisma.patient.findMany({
    where: { branchId: ctx.branchId, tenantId: ctx.tenantId },
  });
  let patient = null as (typeof allPatients)[number] | null;

  if (lead.patientId) patient = allPatients.find((p) => p.id === lead.patientId) ?? null;
  if (!patient && lead.uhid) patient = allPatients.find((p) => p.uhid === lead.uhid) ?? null;
  if (!patient) {
    const leadPhones = [normalizePhone(lead.phone), normalizePhone(lead.alternatePhone)].filter(Boolean);
    patient = allPatients.find((p) => leadPhones.includes(normalizePhone(p.phone))) ?? null;
  }
  if (!patient) {
    patient = allPatients.find((p) => normalizeName(p.fullName) === normalizeName(lead.fullName)) ?? null;
  }

  const visits = patient
    ? await prisma.visit.findMany({
        where: { patientId: patient.id, branchId: patient.branchId ?? undefined },
        orderBy: { updatedAt: "desc" },
      })
    : lead.convertedVisitId
      ? await prisma.visit.findMany({ where: { id: lead.convertedVisitId } })
      : [];

  const uhid = lead.uhid ?? patient?.uhid;
  const leadName = normalizeName(lead.fullName);

  const prescriptions = (pharmacyState.prescriptions ?? []).filter(
    (rx) =>
      (uhid && rx.uhid === uhid) ||
      (patient?.uhid && rx.uhid === patient.uhid) ||
      normalizeName(rx.patientName) === leadName,
  );
  const bills = (pharmacyState.bills ?? []).filter(
    (bill) =>
      (uhid && bill.uhid === uhid) ||
      normalizeName(bill.patientName) === leadName ||
      prescriptions.some((rx) => rx.id === bill.prescriptionId),
  );

  const sessions = (counsellorState.sessions ?? []).filter(
    (session) =>
      session.patientId === (patient?.id ?? lead.patientId) || visits.some((visit) => visit.id === session.visitId),
  );
  const leadActivities = state.activities.filter((activity) => activity.leadId === lead.id);
  const leadFollowUps = state.followUps.filter((followUp) => followUp.leadId === lead.id);

  let matchType: CrmPatientHistory["matchType"] = "none";
  if (lead.patientId && patient) matchType = "patient_id";
  else if (patient && normalizePhone(patient.phone) === normalizePhone(lead.phone)) matchType = "phone";
  else if (patient) matchType = "name";
  else if (lead.convertedVisitId) matchType = "visit";

  const visitEvents = visits.map((visit) => ({
    id: `visit-${visit.id}`,
    at: visit.checkInAt ? visit.checkInAt.toISOString() : new Date().toISOString(),
    category: (visit.billAmount ? "billing" : "visit") as "billing" | "visit",
    title: `Visit — ${visit.doctorName || "Unassigned"}`,
    detail: [
      `Stage: ${formatStageStatus(visit.stage)}`,
      visit.token != null ? `Token #${visit.token}` : null,
      visit.packageLabel ?? null,
      visit.routingNote ?? null,
      visit.deferredReason ? `Deferred: ${visit.deferredReason}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: visit.billAmount != null ? Number(visit.billAmount) : undefined,
    status: visit.billingStatus ?? undefined,
  }));

  const pharmacyEvents = [
    ...prescriptions.map((rx) => ({
      id: `rx-${rx.id}`,
      at: rx.createdAt,
      category: "pharmacy" as const,
      title: `Prescription — ${rx.status.replace(/_/g, " ")}`,
      detail: `${rx.lines.length} item(s) · Dr. ${rx.doctorName} · ${rx.source.toUpperCase()}`,
      status: rx.status,
      amount: undefined,
    })),
    ...bills.map((bill) => ({
      id: `ph-bill-${bill.id}`,
      at: bill.createdAt,
      category: "pharmacy" as const,
      title: `Pharmacy bill ${bill.id}`,
      detail: `${bill.lines.length} item(s) · GST ₹${bill.gstTotal.toFixed(0)}`,
      amount: bill.total,
      status: bill.paid ? "paid" : "pending",
    })),
  ];

  const counselEvents = sessions.map((session) => ({
    id: `counsel-${session.id}`,
    at: session.completedAt ?? session.startedAt,
    category: "counselling" as const,
    title: session.quote ? `Counselling — ${session.quote.packageLabel}` : "Counselling session",
    detail: [
      session.outcome ? `Outcome: ${session.outcome}` : "In progress",
      session.quote ? `Net ₹${session.quote.netAmount.toLocaleString("en-IN")}` : null,
      session.internalNotes ? session.internalNotes.slice(0, 80) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: session.quote?.netAmount,
    status: session.outcome,
  }));

  const crmEvents = [
    ...leadActivities.map((item) => ({
      id: `crm-${item.id}`,
      at: item.at,
      category: "crm" as const,
      title: item.type.charAt(0).toUpperCase() + item.type.slice(1),
      detail: `${item.actor}: ${item.summary}`,
      amount: undefined,
      status: undefined,
    })),
    ...leadFollowUps.map((item) => ({
      id: `fu-${item.id}`,
      at: item.scheduledAt,
      category: "follow_up" as const,
      title: `Follow-up (${item.channel})`,
      detail: [item.notes, item.outcome, `Status: ${item.status}`].filter(Boolean).join(" · "),
      amount: undefined,
      status: item.status,
    })),
  ];

  const timeline = [...crmEvents, ...visitEvents, ...counselEvents, ...pharmacyEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const visitBilled = visits.reduce((n, visit) => n + Number(visit.billAmount ?? 0), 0);
  const visitPaid = visits.reduce(
    (n, visit) =>
      n +
      Number(visit.amountPaid ?? ((visit.billingStatus ?? "pending") === "paid" ? (visit.billAmount ?? 0) : 0)),
    0,
  );
  const visitOutstanding = visits.reduce((n, visit) => n + Number(visit.balanceDue ?? 0), 0);
  const pharmacyTotal = bills.reduce((n, bill) => n + bill.total, 0);
  const pharmacyPaid = bills.filter((bill) => bill.paid).reduce((n, bill) => n + bill.total, 0);
  const outstanding = Math.max(visitOutstanding, Number(patient?.balance ?? 0)) + pharmacyTotal - pharmacyPaid;

  return {
    matchType,
    patient: patient
      ? {
          id: patient.id,
          uhid: patient.uhid,
          name: patient.fullName,
          phone: patient.phone,
          age: patient.age ?? 0,
          gender: patient.gender ?? "O",
          department: patient.departmentLabel ?? null,
          referrer: patient.referrer ?? null,
          lastVisit: patient.lastVisitAt ? patient.lastVisitAt.toISOString().slice(0, 10) : null,
        }
      : undefined,
    visits: visits.map((visit) => ({
      id: visit.id,
      doctorName: visit.doctorName ?? "Doctor",
      stage: visit.stage,
      billing: visit.billingStatus ?? "pending",
      token: visit.token ?? undefined,
      billAmount: visit.billAmount != null ? Number(visit.billAmount) : null,
      amountPaid: visit.amountPaid != null ? Number(visit.amountPaid) : null,
      balanceDue: visit.balanceDue != null ? Number(visit.balanceDue) : null,
      counselPackageLabel: visit.packageLabel ?? undefined,
      deferredReason: visit.deferredReason ?? undefined,
    })),
    pharmacyRx: prescriptions,
    pharmacyBills: bills,
    counselSessions: sessions,
    crmActivities: leadActivities,
    followUps: leadFollowUps,
    timeline,
    billing: {
      totalBilled: visitBilled + pharmacyTotal,
      totalPaid: visitPaid + pharmacyPaid,
      outstanding,
      visitCount: visits.length,
      pharmacyTotal,
      pharmacyPaid,
    },
  };
}

export async function transferCrmAbsenceAction(input: {
  crmAgentId: string;
  until: string;
  reason: string;
  transferLeads: boolean;
}): Promise<{ transferred: number }> {
  await requireAnyModule("crm", "hr");
  const state = await readState();
  const agent = state.agents.find((item) => item.id === input.crmAgentId);
  if (!agent) return { transferred: 0 };
  agent.unavailableUntil = input.until;
  agent.unavailableReason = input.reason;

  let transferred = 0;
  if (input.transferLeads) {
    const target =
      state.agents.find(
        (item) =>
          item.id !== input.crmAgentId &&
          item.active &&
          (!item.unavailableUntil || new Date(item.unavailableUntil) < new Date()) &&
          item.role !== "manager",
      ) ?? null;
    if (target) {
      const now = new Date().toISOString();
      state.leads = state.leads.map((lead) => {
        if (lead.assigneeId !== input.crmAgentId || ["won", "lost"].includes(lead.stageId)) return lead;
        transferred += 1;
        return { ...lead, assigneeId: target.id, updatedAt: now };
      });
    }
  }

  await saveCrmStateAction(state);
  return { transferred };
}

export async function clearCrmAbsenceAction(crmAgentId: string): Promise<void> {
  await requireAnyModule("crm", "hr");
  const state = await readState();
  state.agents = state.agents.map((agent) =>
    agent.id === crmAgentId ? { ...agent, unavailableUntil: undefined, unavailableReason: undefined } : agent,
  );
  await saveCrmStateAction(state);
}
