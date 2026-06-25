import { mapPrismaPatientRow } from "@/lib/frontdesk-workflow";
import { prisma } from "@/lib/prisma";
import type { Patient } from "@/design-system/frontdesk-data";
import { assertNotViewer, type AdminOperator } from "@/server/admin/guards";
import { backfillBranchScope } from "@/server/branch-scope";
import { deletePatientsByIds } from "@/server/clinical/delete-patient";
import { searchPatientsPaginated } from "@/server/clinical";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { writePlatformAudit } from "@/server/platform-audit";
import { branchClinicalWhere } from "@/server/tenancy";

export type AdminPatientHistory = {
  patient: Patient;
  visits: {
    id: string;
    token: number | null;
    stage: string;
    doctorName: string | null;
    checkInAt: string | null;
    billAmount: number | null;
    amountPaid: number | null;
    balanceDue: number | null;
    billing: string;
    createdAt: string;
  }[];
  invoices: {
    id: string;
    invoiceNo: string;
    grandTotal: number;
    status: string;
    createdAt: string;
  }[];
  formSubmissions: {
    id: string;
    formId: string;
    visitId: string | null;
    createdAt: string;
    summary: string;
    data: Record<string, unknown>;
  }[];
  consultations: {
    id: string;
    visitId: string;
    doctorId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    notes: string;
    diagnosisSummary: string;
  }[];
  appointments: {
    id: string;
    date: string;
    time: string;
    status: string;
    doctorName: string | null;
  }[];
};

export async function searchAdminPatients(
  ctx: ServerContext,
  input: { q?: string; page?: number; pageSize?: number; view?: "all" | "balance" | "today" },
) {
  await backfillBranchScope(ctx);
  return searchPatientsPaginated(ctx, input);
}

export async function getAdminPatientHistory(
  ctx: ServerContext,
  patientId: string,
): Promise<AdminPatientHistory> {
  await backfillBranchScope(ctx);
  const clinicalWhere = branchClinicalWhere(ctx);

  const patientRow = await prisma.patient.findFirst({
    where: { id: patientId, ...clinicalWhere },
  });
  if (!patientRow) {
    throw new ServerActionError("NOT_FOUND", "Patient not found in this branch.");
  }

  const [visits, invoices, submissions, appointments, consultations] = await Promise.all([
    prisma.opdVisit.findMany({
      where: { patientId, ...clinicalWhere },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: { patientId, tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.formSubmission.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.appointment.findMany({
      where: { patientId, ...clinicalWhere },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const patient = mapPrismaPatientRow(patientRow);

  return {
    patient,
    visits: visits.map((v) => ({
      id: v.id,
      token: v.token,
      stage: v.stage,
      doctorName: v.doctorName,
      checkInAt: v.checkInAt ?? null,
      billAmount: v.billAmount,
      amountPaid: v.amountPaid,
      balanceDue: v.balanceDue,
      billing: v.billing ?? "pending",
      createdAt: v.createdAt.toISOString(),
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNumber,
      grandTotal: Number(inv.totalAmount),
      status: inv.status,
      createdAt: inv.createdAt.toISOString(),
    })),
    formSubmissions: submissions.map((s) => {
      const data = (s.data ?? {}) as Record<string, unknown>;
      const preview =
        typeof data.notes === "string"
          ? data.notes
          : typeof data.internalNotes === "string"
            ? data.internalNotes
            : typeof data.chiefComplaint === "string"
              ? data.chiefComplaint
              : JSON.stringify(data).slice(0, 80);
      return {
        id: s.id,
        formId: s.formId,
        visitId: s.visitId,
        createdAt: s.createdAt.toISOString(),
        summary: preview || "—",
        data,
      };
    }),
    consultations: consultations.map((c) => {
      const dx = (c.diagnosis ?? {}) as Record<string, unknown>;
      const diagnosisSummary =
        typeof dx.primaryDiagnosis === "string"
          ? dx.primaryDiagnosis
          : typeof dx.icdCode === "string"
            ? dx.icdCode
            : c.notes?.slice(0, 120) || "—";
      return {
        id: c.id,
        visitId: c.visitId,
        doctorId: c.doctorId,
        status: c.status,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        notes: c.notes,
        diagnosisSummary,
      };
    }),
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date ?? "—",
      time: a.time ?? "—",
      status: a.status,
      doctorName: a.doctorName,
    })),
  };
}

export async function deleteAdminPatient(
  ctx: ServerContext,
  operator: AdminOperator,
  patientId: string,
): Promise<{ deleted: boolean; patientName: string }> {
  assertNotViewer(operator);
  await backfillBranchScope(ctx);

  const patientRow = await prisma.patient.findFirst({
    where: { id: patientId, ...branchClinicalWhere(ctx) },
    select: { id: true, fullName: true, name: true },
  });
  if (!patientRow) {
    throw new ServerActionError("NOT_FOUND", "Patient not found in this branch.");
  }

  const patientName = patientRow.fullName?.trim() || patientRow.name?.trim() || patientId;
  const count = await deletePatientsByIds([patientId]);
  if (count === 0) {
    throw new ServerActionError("INTERNAL_ERROR", "Could not delete patient.");
  }

  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "admin",
    action: "patient_deleted",
    entityType: "patient",
    entityId: patientId,
    summary: `Patient deleted: ${patientName}`,
    severity: "warning",
  });

  return { deleted: true, patientName };
}
