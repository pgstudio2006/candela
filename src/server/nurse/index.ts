import type { NursingEpisode, NursingHandoffPayload, TreatmentSession, VitalsRecord, ConsentRecord } from "@/design-system/nurse-data";
import { DEMO_NURSE_ID, DEMO_NURSE_NAME, requiredConsentsComplete, sessionCountForPackage, templatesForHandoff } from "@/design-system/nurse-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import { prisma } from "@/lib/prisma";
import { getClinicalSnapshot } from "@/server/clinical";
import { resolveNurseOperator } from "@/server/module-operator";
import type { ServerContext } from "@/server/context";

function asRecord(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string | number | boolean>;
}

function asNursingHandoff(value: {
  visitId: string;
  patientId: string;
  patientName: string;
  uhid: string;
  doctorId: string;
  doctorName: string;
  treatmentPath: string;
  packageId: string;
  packageLabel: string;
  billingStatus: string;
  amountPaid: number;
  balanceDue: number | null;
  netAmount: number;
  commercialConsent: boolean;
  billingHandoff: unknown;
  consultation: unknown;
  ipdWard: string | null;
  ipdBed: string | null;
  sentAt: string;
}): NursingHandoffPayload {
  return {
    visitId: value.visitId,
    patientId: value.patientId,
    patientName: value.patientName,
    uhid: value.uhid,
    doctorId: value.doctorId,
    doctorName: value.doctorName,
    treatmentPath: value.treatmentPath as NursingHandoffPayload["treatmentPath"],
    packageId: value.packageId,
    packageLabel: value.packageLabel,
    billingStatus: value.billingStatus,
    amountPaid: value.amountPaid,
    balanceDue: value.balanceDue ?? undefined,
    netAmount: value.netAmount,
    commercialConsent: value.commercialConsent,
    billingHandoff: value.billingHandoff ? (value.billingHandoff as NursingHandoffPayload["billingHandoff"]) : undefined,
    consultation: value.consultation ? (value.consultation as NursingHandoffPayload["consultation"]) : undefined,
    ipdWard: value.ipdWard ?? undefined,
    ipdBed: value.ipdBed ?? undefined,
    sentAt: value.sentAt,
  };
}

function asEpisode(row: {
  id: string;
  visitId: string;
  patientId: string;
  nurseId: string;
  nurseName: string;
  branchId: string;
  treatmentPath: string;
  packageLabel: string;
  packageId: string;
  doctorName: string;
  doctorId: string;
  billingStatus: string;
  balanceDue: number | null;
  status: string;
  priority: string;
  queuedAt: string;
  vitals: unknown;
  consents: unknown;
  sessions: unknown;
  internalNotes: string;
  completedAt: string | null;
}): NursingEpisode {
  return {
    id: row.id,
    visitId: row.visitId,
    patientId: row.patientId,
    nurseId: row.nurseId,
    nurseName: row.nurseName,
    branchId: row.branchId,
    treatmentPath: row.treatmentPath as NursingEpisode["treatmentPath"],
    packageLabel: row.packageLabel,
    packageId: row.packageId,
    doctorName: row.doctorName,
    doctorId: row.doctorId,
    billingStatus: row.billingStatus,
    balanceDue: row.balanceDue ?? undefined,
    status: row.status as NursingEpisode["status"],
    priority: row.priority as NursingEpisode["priority"],
    queuedAt: row.queuedAt,
    vitals: row.vitals ? (row.vitals as VitalsRecord) : undefined,
    consents: (Array.isArray(row.consents) ? row.consents : []) as ConsentRecord[],
    sessions: (Array.isArray(row.sessions) ? row.sessions : []) as TreatmentSession[],
    internalNotes: row.internalNotes,
    completedAt: row.completedAt ?? undefined,
  };
}

function buildConsents(handoff: NursingHandoffPayload): ConsentRecord[] {
  return templatesForHandoff(handoff).map((t) => ({
    id: `cr_${handoff.visitId}_${t.id}`,
    templateId: t.id,
    templateVersion: t.version,
    visitId: handoff.visitId,
    patientId: handoff.patientId,
    label: t.label,
    status: "draft",
    required: t.required,
    language: t.language,
  }));
}

function buildSessions(handoff: NursingHandoffPayload): TreatmentSession[] {
  const total = sessionCountForPackage(handoff.packageId);
  return [
    {
      id: `ts_${handoff.visitId}_1`,
      visitId: handoff.visitId,
      sessionNumber: 1,
      totalSessions: total,
      procedure: handoff.packageLabel,
      status: "scheduled",
    },
  ];
}

export type NurseSnapshot = {
  patients: Patient[];
  visits: Visit[];
  handoffs: NursingHandoffPayload[];
  episodes: NursingEpisode[];
};

export async function getNurseSnapshot(ctx: ServerContext): Promise<NurseSnapshot> {
  const clinical = await getClinicalSnapshot(ctx);
  const branchVisitIds = clinical.visits.map((v) => v.id);
  const [handoffRows, episodeRows] = await Promise.all([
    prisma.nursingHandoff.findMany({
      where: { visitId: { in: branchVisitIds } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.nursingEpisode.findMany({
      where: { branchId: ctx.branchId },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    patients: clinical.patients,
    visits: clinical.visits,
    handoffs: handoffRows.map(asNursingHandoff),
    episodes: episodeRows.map(asEpisode),
  };
}

export async function claimEpisode(visitId: string, ctx: ServerContext) {
  const { operatorId, operatorName } = await resolveNurseOperator(ctx);
  const existing = await prisma.nursingEpisode.findUnique({ where: { visitId } });
  if (existing) return;
  const handoffRow = await prisma.nursingHandoff.findUnique({ where: { visitId } });
  if (!handoffRow) return;
  const handoff = asNursingHandoff(handoffRow);

  await prisma.nursingEpisode.create({
    data: {
      id: `ep_${visitId}`,
      visitId,
      patientId: handoff.patientId,
      nurseId: operatorId,
      nurseName: operatorName,
      branchId: ctx.branchId,
      treatmentPath: handoff.treatmentPath,
      packageLabel: handoff.packageLabel,
      packageId: handoff.packageId,
      doctorName: handoff.doctorName,
      doctorId: handoff.doctorId,
      billingStatus: handoff.billingStatus,
      balanceDue: handoff.balanceDue ?? null,
      status: "queued",
      priority: handoff.treatmentPath === "ipd" ? "high" : "normal",
      queuedAt: handoff.sentAt,
      consents: buildConsents(handoff),
      sessions: buildSessions(handoff),
      internalNotes: "",
    },
  });
}

export async function saveVitals(
  visitId: string,
  vitals: Omit<VitalsRecord, "visitId" | "recordedAt" | "recordedBy">,
  ctx: ServerContext,
) {
  const { operatorName } = await resolveNurseOperator(ctx);
  const record: VitalsRecord = {
    ...vitals,
    visitId,
    recordedAt: new Date().toISOString(),
    recordedBy: operatorName,
  };
  await prisma.$transaction([
    prisma.nursingEpisode.update({
      where: { visitId },
      data: {
        vitals: record,
        status: "consent",
      },
    }),
    prisma.opdVisit.updateMany({
      where: { id: visitId, stage: "nursing_queue" },
      data: { stage: "nursing_active" },
    }),
  ]);
}

async function patchConsent(visitId: string, consentId: string, patch: Partial<ConsentRecord>) {
  const episode = await prisma.nursingEpisode.findUnique({ where: { visitId } });
  if (!episode) return;
  const consents = (Array.isArray(episode.consents) ? episode.consents : []) as ConsentRecord[];
  const next = consents.map((c) => (c.id === consentId ? { ...c, ...patch } : c));
  await prisma.nursingEpisode.update({
    where: { visitId },
    data: { consents: next },
  });
}

export async function presentConsent(visitId: string, consentId: string) {
  await patchConsent(visitId, consentId, { status: "presented" });
}

export async function signConsent(
  visitId: string,
  consentId: string,
  data: { signatureDataUrl: string; signerName: string; signerRole: ConsentRecord["signerRole"]; witnessName?: string },
) {
  await patchConsent(visitId, consentId, {
    status: "signed",
    captureMode: "canvas",
    signatureDataUrl: data.signatureDataUrl,
    signerName: data.signerName,
    signerRole: data.signerRole ?? "patient",
    witnessName: data.witnessName,
    signedAt: new Date().toISOString(),
  });
}

export async function uploadConsent(
  visitId: string,
  consentId: string,
  data: { uploadDataUrl: string; uploadFileName: string; signerName: string },
) {
  await patchConsent(visitId, consentId, {
    status: "uploaded",
    captureMode: "upload",
    uploadDataUrl: data.uploadDataUrl,
    uploadFileName: data.uploadFileName,
    signerName: data.signerName,
    signedAt: new Date().toISOString(),
  });
}

export async function verifyConsent(visitId: string, consentId: string) {
  const episode = await prisma.nursingEpisode.findUnique({ where: { visitId } });
  if (!episode) return;
  const consents = ((Array.isArray(episode.consents) ? episode.consents : []) as ConsentRecord[]).map((c) =>
    c.id === consentId
      ? {
          ...c,
          status: "verified" as const,
          verifiedAt: new Date().toISOString(),
          verifiedBy: DEMO_NURSE_NAME,
        }
      : c,
  );
  await prisma.nursingEpisode.update({
    where: { visitId },
    data: {
      consents,
      status: requiredConsentsComplete(consents) ? "ready" : episode.status,
    },
  });
}

export async function declineConsent(visitId: string, consentId: string, reason: string) {
  await patchConsent(visitId, consentId, {
    status: "declined",
    declinedReason: reason,
  });
}

export async function startSession(visitId: string, bay: string) {
  const episode = await prisma.nursingEpisode.findUnique({ where: { visitId } });
  if (!episode) return;
  const consents = (Array.isArray(episode.consents) ? episode.consents : []) as ConsentRecord[];
  if (!requiredConsentsComplete(consents)) return;
  const sessions = ((Array.isArray(episode.sessions) ? episode.sessions : []) as TreatmentSession[]).map((s, i) =>
    i === 0 ? { ...s, status: "in_progress" as const, bay, startedAt: new Date().toISOString() } : s,
  );
  await prisma.nursingEpisode.update({
    where: { visitId },
    data: {
      sessions,
      status: "in_treatment",
    },
  });
}

export async function completeSession(visitId: string, sessionId: string, notes?: string) {
  const episode = await prisma.nursingEpisode.findUnique({ where: { visitId } });
  if (!episode) return;
  const sessions = ((Array.isArray(episode.sessions) ? episode.sessions : []) as TreatmentSession[]).map((s) =>
    s.id === sessionId ? { ...s, status: "completed" as const, completedAt: new Date().toISOString(), notes } : s,
  );
  await prisma.nursingEpisode.update({
    where: { visitId },
    data: { sessions },
  });
}

export async function completeEpisode(visitId: string) {
  await prisma.$transaction([
    prisma.nursingEpisode.update({
      where: { visitId },
      data: { status: "completed", completedAt: new Date().toISOString() },
    }),
    prisma.nursingHandoff.deleteMany({ where: { visitId } }),
    prisma.opdVisit.update({
      where: { id: visitId },
      data: {
        stage: "completed",
        routingNote: "Treatment session 1 complete · care plan active",
      },
    }),
  ]);
}

export async function updateEpisodeNotes(visitId: string, notes: string) {
  await prisma.nursingEpisode.update({
    where: { visitId },
    data: { internalNotes: notes },
  });
}
