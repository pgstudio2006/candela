"use server";

import { prisma } from "@/lib/prisma";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import type { ConsultationRecord, CounsellorQueueItem } from "@/design-system/doctor-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import { requireModule } from "@/server/auth";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { verifyPassword } from "@/server/revenue/password";
import { mapPrismaPatientRow } from "@/lib/frontdesk-workflow";
import { readCounsellorWorkspace, writeCounsellorWorkspace } from "@/server/workspace-state";
import { getServerContext } from "@/server/context";
import { parseJson, defaultCounsellorState, type CounsellorStateShape } from "@/server/revenue/state-seeds";

const DEMO_TENANT_ID = "tenant_navayu";

async function counsellorScope() {
  const ctx = await requireModule("counsellor");
  return { tenantId: ctx.tenantId, branchId: ctx.branchId };
}

export type CounsellorLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

async function readState(): Promise<CounsellorStateShape> {
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  const state = await readCounsellorWorkspace(ctx, defaultCounsellorState);
  return { ...state, activeBranchId: ctx.branchId };
}

export async function validateCounsellorLoginAction(
  email: string,
  password: string,
): Promise<CounsellorLoginResult> {
  await ensureRevenueSeeded();
  const normalized = email.trim().toLowerCase();
  const cred = await prisma.counsellorOperatorCredential.findUnique({ where: { email: normalized } });
  if (!cred || !cred.active) {
    return { ok: false, error: "No counsellor account for this email." };
  }
  if (!(await verifyPassword(password, cred.passwordHash))) {
    return { ok: false, error: "Incorrect password." };
  }
  return { ok: true, operatorId: cred.id, name: cred.name, email: cred.email };
}

export async function getCounsellorStateAction(): Promise<CounsellorStateShape> {
  await requireModule("counsellor");
  return readState();
}

export async function saveCounsellorStateAction(next: CounsellorStateShape): Promise<void> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  await writeCounsellorWorkspace(ctx, {
    ...next,
    activeBranchId: ctx.branchId,
  });
}

export async function listCounsellorQueueAction(): Promise<CounsellorQueueItem[]> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { branchId } = await counsellorScope();
  const branchVisitIds = new Set(
    (
      await prisma.opdVisit.findMany({
        where: { branchId },
        select: { id: true },
      })
    ).map((v) => v.id),
  );
  const rows = await prisma.counsellorQueueItem.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 200,
  });
  return rows
    .filter((row) => branchVisitIds.has(row.visitId))
    .map((row) => ({
    id: row.id,
    visitId: row.visitId,
    patientId: row.patientId,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    sentAt: String(row.sentAt),
    treatmentMode: row.treatmentMode as CounsellorQueueItem["treatmentMode"],
    packageId: row.packageId ?? undefined,
    packageLabel: row.packageLabel ?? undefined,
    priority: row.priority === "high" ? "high" : "normal",
    payload: row.payload as ConsultationRecord,
  }));
}

export async function removeCounsellorQueueItemAction(visitId: string): Promise<void> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  await prisma.counsellorQueueItem.deleteMany({ where: { visitId } });
}

export async function listBillingHandoffsAction(): Promise<BillingHandoffPayload[]> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { branchId } = await counsellorScope();
  const rows = await prisma.billingHandoff.findMany({
    where: { branchId },
    include: { patient: true },
    orderBy: { sentAt: "desc" },
    take: 300,
  });
  return rows.map((row) => ({
    visitId: row.visitId,
    patientId: row.patientId,
    patientName: row.patientName ?? row.patient.fullName ?? "Patient",
    uhid: row.patient.uhid,
    quote: row.quote as BillingHandoffPayload["quote"],
    counsellorName: row.counsellorName,
    counselNotes: row.counselNotes ?? "",
    doctorName: row.doctorName ?? "",
    doctorId: row.doctorId ?? "",
    sentAt: row.sentAt.toISOString(),
    paymentExpectation: (row.paymentExpectation ?? "desk") as BillingHandoffPayload["paymentExpectation"],
    treatmentMode: (row.treatmentMode ?? undefined) as BillingHandoffPayload["treatmentMode"],
    admissionRecommended: row.admissionRecommended ?? undefined,
    diagnosisSummary: row.diagnosisSummary ?? undefined,
  }));
}

export async function saveBillingHandoffAction(payload: BillingHandoffPayload): Promise<void> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { tenantId, branchId } = await counsellorScope();
  await prisma.billingHandoff.upsert({
    where: { id: `bh_${payload.visitId}` },
    create: {
      id: `bh_${payload.visitId}`,
      tenantId,
      branchId,
      visitId: payload.visitId,
      patientId: payload.patientId,
      patientName: payload.patientName,
      uhid: payload.uhid,
      packageId: payload.quote.packageId,
      quote: payload.quote,
      counsellorName: payload.counsellorName,
      counselNotes: payload.counselNotes,
      doctorName: payload.doctorName,
      doctorId: payload.doctorId,
      paymentExpectation: payload.paymentExpectation,
      treatmentMode: payload.treatmentMode,
      admissionRecommended: payload.admissionRecommended,
      diagnosisSummary: payload.diagnosisSummary,
      sentAt: new Date(payload.sentAt),
    },
    update: {
      patientName: payload.patientName,
      uhid: payload.uhid,
      quote: payload.quote,
      counsellorName: payload.counsellorName,
      counselNotes: payload.counselNotes,
      doctorName: payload.doctorName,
      doctorId: payload.doctorId,
      paymentExpectation: payload.paymentExpectation,
      treatmentMode: payload.treatmentMode,
      admissionRecommended: payload.admissionRecommended,
      diagnosisSummary: payload.diagnosisSummary,
      sentAt: new Date(payload.sentAt),
    },
  });
}

export async function setVisitStageAction(visitId: string, stage: Visit["stage"]): Promise<void> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { branchId } = await counsellorScope();
  await prisma.opdVisit.updateMany({
    where: { id: visitId, branchId },
    data: { stage },
  });
}

export async function listCounsellorPatientsAction(): Promise<Patient[]> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { branchId } = await counsellorScope();
  const rows = await prisma.patient.findMany({
    where: { branchId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((row) =>
    mapPrismaPatientRow({
      ...row,
      department: row.departmentLabel ?? row.department,
    }),
  );
}

export async function listCounsellorVisitsAction(): Promise<Visit[]> {
  await requireModule("counsellor");
  await ensureRevenueSeeded();
  const { branchId } = await counsellorScope();
  const rows = await prisma.opdVisit.findMany({
    where: { branchId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((row) => ({
    id: row.id,
    patientId: row.patientId,
    token: row.token ?? undefined,
    stage: row.stage as Visit["stage"],
    departmentId: row.departmentId ?? "dept_general",
    doctorId: row.doctorId ?? "",
    doctorName: row.doctorName ?? "Doctor",
    billing: (row.billing ?? "pending") as Visit["billing"],
    exam: (row.exam ?? "not_started") as Visit["exam"],
    appointment: row.appointment,
    appointmentTime: row.appointmentTime ?? undefined,
    waitMin: row.waitMin ?? 0,
    checkInAt: row.checkInAt ?? undefined,
    billAmount: row.billAmount ?? undefined,
    amountPaid: row.amountPaid ?? undefined,
    balanceDue: row.balanceDue ?? undefined,
    treatmentPath: (row.treatmentPath ?? undefined) as Visit["treatmentPath"],
    ipdAdmissionId: row.ipdAdmissionId ?? undefined,
    counselPackageLabel: row.counselPackageLabel ?? undefined,
    deferredReason: row.deferredReason ?? undefined,
    routingNote: row.routingNote ?? undefined,
  }));
}
