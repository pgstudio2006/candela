import type {
  ConsultationRecord,
  CounsellorQueueItem,
  DoctorTemplate,
  IpdPatient,
  PrescriptionLine,
  TreatmentMode,
} from "@/design-system/doctor-data";
import { CARE_PACKAGES, DEMO_DOCTOR_ID } from "@/design-system/doctor-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { DocumentTemplate } from "@/design-system/document-templates";
import { validateCompleteConsultation } from "@/lib/doctor-validation";
import { isRedFlagVisit } from "@/lib/frontdesk-workflow";
import { prisma } from "@/lib/prisma";
import { getClinicalSnapshot } from "@/server/clinical";
import { resolveDoctorIdForContext } from "@/server/clinical/roster";
import type { ServerContext } from "@/server/context";
import {
  assertDoctorOwnsVisit,
  requireDoctorConsult,
  requireDoctorVisit,
} from "@/server/doctor/guards";
import { ServerActionError } from "@/server/errors";
import { notifyPrescriptionWhatsapp } from "@/server/notifications";
import { writePlatformAudit } from "@/server/platform-audit";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";

function asRecord(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string | number | boolean>;
}

function mapConsultation(row: {
  visitId: string;
  patientId: string;
  doctorId: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  treatmentMode: string;
  recommendCounsellor: boolean;
  skipCounsellor: boolean;
  packageId: string | null;
  counsellorNotes: string | null;
  doctorAdvice: string | null;
  whatsappRxSent: boolean;
  examination: unknown;
  diagnosis: unknown;
  treatment: unknown;
  prescription: unknown;
  notes: string;
  scribeTranscript: string | null;
  scribeLanguage: string | null;
  scribeAppliedAt: string | null;
  templateId: string | null;
  handoff: unknown;
}): ConsultationRecord {
  return {
    visitId: row.visitId,
    patientId: row.patientId,
    doctorId: row.doctorId,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
    status: row.status as ConsultationRecord["status"],
    treatmentMode: row.treatmentMode as ConsultationRecord["treatmentMode"],
    recommendCounsellor: row.recommendCounsellor,
    skipCounsellor: row.skipCounsellor,
    packageId: row.packageId ?? undefined,
    counsellorNotes: row.counsellorNotes ?? undefined,
    doctorAdvice: row.doctorAdvice ?? undefined,
    whatsappRxSent: row.whatsappRxSent,
    examination: asRecord(row.examination),
    diagnosis: asRecord(row.diagnosis),
    treatment: asRecord(row.treatment),
    prescription: (Array.isArray(row.prescription) ? row.prescription : []) as PrescriptionLine[],
    notes: row.notes,
    scribeTranscript: row.scribeTranscript ?? undefined,
    scribeLanguage: row.scribeLanguage ?? undefined,
    scribeAppliedAt: row.scribeAppliedAt ?? undefined,
    templateId: row.templateId ?? undefined,
    handoff: row.handoff ? asRecord(row.handoff) : undefined,
  };
}

export type JuniorExamSubmission = {
  visitId: string;
  data: Record<string, string | number | boolean>;
  submittedAt: string;
};

export type IpdRoundRecord = {
  id: string;
  at: string;
  note: string;
  data: Record<string, string | number | boolean>;
};

export type DoctorSnapshot = {
  patients: Patient[];
  visits: Visit[];
  activeDoctorId: string;
  consultations: ConsultationRecord[];
  counsellorQueue: CounsellorQueueItem[];
  ipdPatients: IpdPatient[];
  templates: DoctorTemplate[];
  packages: typeof CARE_PACKAGES;
  documentTemplates: DocumentTemplate[];
  juniorSubmissions: JuniorExamSubmission[];
};

async function loadCarePackages() {
  const depts = await prisma.adminDepartment.findMany({ where: { active: true } });
  const ids = new Set(depts.flatMap((d) => (Array.isArray(d.defaultPackageIds) ? d.defaultPackageIds : [])));
  const fromSeed = CARE_PACKAGES.filter((p) => ids.has(p.id) || ids.size === 0);
  return fromSeed.length ? fromSeed : CARE_PACKAGES;
}

export async function getDoctorSnapshot(
  ctx: ServerContext,
  activeDoctorId?: string,
): Promise<DoctorSnapshot> {
  const doctorId = activeDoctorId ?? (await resolveDoctorIdForContext(ctx));
  const [clinical, consultRows, queueRows, ipdRows, templateRows, docRows, packages, juniorRows] =
    await Promise.all([
      getClinicalSnapshot(ctx),
      prisma.consultation.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.counsellorQueueItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.ipdAdmission.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.doctorTemplate.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.documentTemplate.findMany({ orderBy: { createdAt: "asc" } }),
      loadCarePackages(),
      prisma.formSubmission.findMany({
        where: { formId: "junior-exam" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const branchVisitIds = new Set(clinical.visits.map((v) => v.id));
  const branchPatientIds = new Set(clinical.patients.map((p) => p.id));

  const juniorByVisit = new Map<string, JuniorExamSubmission>();
  for (const row of juniorRows) {
    if (!row.visitId || !branchVisitIds.has(row.visitId)) continue;
    if (juniorByVisit.has(row.visitId)) continue;
    juniorByVisit.set(row.visitId, {
      visitId: row.visitId,
      data: asRecord(row.data),
      submittedAt: row.submittedAt,
    });
  }

  return {
    patients: clinical.patients,
    visits: clinical.visits,
    activeDoctorId: doctorId,
    consultations: consultRows
      .filter((row) => branchVisitIds.has(row.visitId))
      .map(mapConsultation),
    counsellorQueue: queueRows
      .filter((row) => branchVisitIds.has(row.visitId))
      .map((row) => ({
        id: row.id,
        visitId: row.visitId,
        patientId: row.patientId,
        doctorId: row.doctorId,
        doctorName: row.doctorName,
        sentAt: String(row.sentAt),
        treatmentMode: row.treatmentMode as TreatmentMode,
        packageId: row.packageId ?? undefined,
        packageLabel: row.packageLabel ?? undefined,
        priority: row.priority as "normal" | "high",
        payload: asRecord(row.payload) as unknown as ConsultationRecord,
      })),
    ipdPatients: ipdRows
      .filter((row) => branchPatientIds.has(row.patientId))
      .map((row) => ({
        id: row.id,
        visitId: row.visitId,
        patientId: row.patientId,
        ward: row.ward,
        bed: row.bed,
        admittedAt: row.admittedAt,
        diagnosis: row.diagnosis,
        attendingDoctorId: row.attendingDoctorId,
        lastRoundAt: row.lastRoundAt ?? undefined,
        lastRoundNote: row.lastRoundNote ?? undefined,
        status: row.status as IpdPatient["status"],
      })),
    templates: templateRows.map((row) => ({
      id: row.id,
      label: row.label,
      doctorId: row.doctorId,
      disease: row.disease,
      diagnosis: asRecord(row.diagnosis),
      treatment: asRecord(row.treatment),
      prescription: (Array.isArray(row.prescription) ? row.prescription : []) as PrescriptionLine[],
    })),
    packages,
    documentTemplates: docRows.map((row) => ({
      id: row.id,
      kind: row.kind as DocumentTemplate["kind"],
      label: row.label,
      layout: row.layout as DocumentTemplate["layout"],
      description: row.description ?? "",
      enabled: row.enabled,
      isSystem: row.isSystem,
    })),
    juniorSubmissions: [...juniorByVisit.values()],
  };
}

function juniorExamToConsultFields(junior: Record<string, string | number | boolean>) {
  return {
    examination: {
      chiefComplaint: String(junior.chiefComplaint ?? ""),
      painScale: junior.painScale ?? "",
      duration: String(junior.duration ?? ""),
      region: String(junior.region ?? ""),
      redFlags: Boolean(junior.redFlags),
      redFlagNotes: String(junior.redFlagNotes ?? ""),
      priorSurgery: Boolean(junior.priorSurgery),
      neuroDeficit: Boolean(junior.neuroDeficit),
      rom: String(junior.rom ?? ""),
      specialTests: String(junior.specialTests ?? ""),
      juniorImpression: String(junior.juniorImpression ?? ""),
      seniorHandoff: String(junior.seniorHandoff ?? ""),
    },
    diagnosis: { clinicalImpression: String(junior.juniorImpression ?? "") },
    treatment: { plan: String(junior.seniorHandoff ?? "") },
    notes: [
      junior.seniorHandoff ? `Handoff: ${junior.seniorHandoff}` : "",
      junior.rom ? `ROM: ${junior.rom}` : "",
      junior.redFlagNotes ? `Red flags: ${junior.redFlagNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function startConsultation(ctx: ServerContext, visitId: string) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  const visit = await assertDoctorOwnsVisit(ctx, visitId, doctorId);

  const existing = await prisma.consultation.findUnique({ where: { visitId } });
  if (existing) {
    const juniorExam = await prisma.formSubmission.findFirst({
      where: { formId: "junior-exam", visitId },
      orderBy: { createdAt: "desc" },
    });
    const junior = asRecord(juniorExam?.data);
    const exam = asRecord(existing.examination);
    if (juniorExam && !exam.chiefComplaint && !exam.juniorImpression) {
      const fromJunior = juniorExamToConsultFields(junior);
      const updated = await prisma.consultation.update({
        where: { visitId },
        data: {
          examination: fromJunior.examination,
          diagnosis: fromJunior.diagnosis,
          treatment: fromJunior.treatment,
          notes: fromJunior.notes || existing.notes,
        },
      });
      await writePlatformAudit({
        ctx,
        module: "doctor",
        action: "consult_started",
        entityType: "visit",
        entityId: visitId,
        summary: `Consultation resumed with junior handoff for visit ${visitId}`,
      });
      return mapConsultation(updated);
    }
    return mapConsultation(existing);
  }

  const juniorExam = await prisma.formSubmission.findFirst({
    where: { formId: "junior-exam", visitId },
    orderBy: { createdAt: "desc" },
  });
  const junior = asRecord(juniorExam?.data);
  const fromJunior = juniorExam ? juniorExamToConsultFields(junior) : null;

  const created = await prisma.consultation.create({
    data: {
      id: `consult_${visitId}`,
      visitId,
      patientId: visit.patientId,
      doctorId,
      startedAt: new Date().toISOString(),
      status: "in_progress",
      treatmentMode: "opd",
      recommendCounsellor: true,
      skipCounsellor: false,
      whatsappRxSent: false,
      examination: fromJunior?.examination ?? {},
      diagnosis: fromJunior?.diagnosis ?? {},
      treatment: fromJunior?.treatment ?? {},
      prescription: [],
      notes: fromJunior?.notes ?? "",
    },
  });

  await writePlatformAudit({
    ctx,
    module: "doctor",
    action: "consult_started",
    entityType: "visit",
    entityId: visitId,
    summary: `Consultation started for visit ${visitId}`,
  });

  return mapConsultation(created);
}

export async function updateConsultation(
  ctx: ServerContext,
  visitId: string,
  patch: Partial<ConsultationRecord>,
) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  const visit = await assertDoctorOwnsVisit(ctx, visitId, doctorId);

  const data: Record<string, unknown> = {};
  if (patch.completedAt !== undefined) data.completedAt = patch.completedAt;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.treatmentMode !== undefined) data.treatmentMode = patch.treatmentMode;
  if (patch.recommendCounsellor !== undefined) data.recommendCounsellor = patch.recommendCounsellor;
  if (patch.skipCounsellor !== undefined) data.skipCounsellor = patch.skipCounsellor;
  if (patch.packageId !== undefined) data.packageId = patch.packageId;
  if (patch.counsellorNotes !== undefined) data.counsellorNotes = patch.counsellorNotes;
  if (patch.doctorAdvice !== undefined) data.doctorAdvice = patch.doctorAdvice;
  if (patch.whatsappRxSent !== undefined) data.whatsappRxSent = patch.whatsappRxSent;
  if (patch.examination !== undefined) data.examination = patch.examination;
  if (patch.diagnosis !== undefined) data.diagnosis = patch.diagnosis;
  if (patch.treatment !== undefined) data.treatment = patch.treatment;
  if (patch.prescription !== undefined) data.prescription = patch.prescription;
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.scribeTranscript !== undefined) data.scribeTranscript = patch.scribeTranscript;
  if (patch.scribeLanguage !== undefined) data.scribeLanguage = patch.scribeLanguage;
  if (patch.scribeAppliedAt !== undefined) data.scribeAppliedAt = patch.scribeAppliedAt;
  if (patch.templateId !== undefined) data.templateId = patch.templateId;
  if (patch.handoff !== undefined) data.handoff = patch.handoff;

  if (Object.keys(data).length === 0) return;

  await prisma.consultation.upsert({
    where: { visitId },
    create: {
      id: `consult_${visitId}`,
      visitId,
      patientId: visit.patientId,
      doctorId,
      startedAt: new Date().toISOString(),
      status: "in_progress",
      treatmentMode: "opd",
      recommendCounsellor: true,
      skipCounsellor: false,
      whatsappRxSent: false,
      examination: {},
      diagnosis: {},
      treatment: {},
      prescription: [],
      notes: "",
      ...data,
    },
    update: data,
  });
}

export async function saveConsultSection(
  ctx: ServerContext,
  visitId: string,
  section: "examination" | "diagnosis" | "treatment",
  data: Record<string, string | number | boolean>,
) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  await requireDoctorConsult(ctx, visitId, doctorId);
  const existing = await prisma.consultation.findUnique({ where: { visitId } });
  if (!existing) {
    throw new ServerActionError("NOT_FOUND", "Consultation not started — open the consult first.");
  }
  const nextSection = {
    ...asRecord(existing[section]),
    ...data,
  };
  await prisma.consultation.update({
    where: { visitId },
    data: { [section]: nextSection },
  });
}

export async function setPrescription(ctx: ServerContext, visitId: string, lines: PrescriptionLine[]) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  await requireDoctorConsult(ctx, visitId, doctorId);
  await prisma.consultation.update({
    where: { visitId },
    data: { prescription: lines },
  });
}

function resolveCounsellorPriority(
  visit: { routingNote?: string | null; notes?: string | null },
  consult: ConsultationRecord,
  handoff: Record<string, string | number | boolean>,
): "normal" | "high" {
  const exam = consult.examination;
  if (isRedFlagVisit({ routingNote: visit.routingNote ?? undefined, notes: visit.notes ?? undefined }) || Boolean(exam.redFlags)) return "high";
  if (String(handoff.conversionPriority ?? "") === "high") return "high";
  return "normal";
}

export async function completeConsultation(
  ctx: ServerContext,
  visitId: string,
  opts: {
    treatmentMode: TreatmentMode;
    recommendCounsellor: boolean;
    skipCounsellor: boolean;
    handoff: Record<string, string | number | boolean>;
    sendWhatsapp: boolean;
  },
) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  const visit = await assertDoctorOwnsVisit(ctx, visitId, doctorId);
  const consultRow = await requireDoctorConsult(ctx, visitId, doctorId);
  const consult = mapConsultation(consultRow);

  validateCompleteConsultation(consult, opts);

  const packageId = String(opts.handoff.packageId ?? "");
  const pkg = CARE_PACKAGES.find((p) => p.id === packageId);
  const completedAt = new Date().toISOString();
  const updatedConsult: ConsultationRecord = {
    ...consult,
    status: "completed",
    completedAt,
    treatmentMode: opts.treatmentMode,
    recommendCounsellor: opts.recommendCounsellor,
    skipCounsellor: opts.skipCounsellor,
    packageId: packageId || undefined,
    counsellorNotes: String(opts.handoff.counsellorNotes ?? ""),
    doctorAdvice: String(opts.handoff.doctorAdvice ?? ""),
    handoff: opts.handoff,
    whatsappRxSent: opts.sendWhatsapp,
  };

  const needsCounsellor = opts.recommendCounsellor && !opts.skipCounsellor;
  const priority = resolveCounsellorPriority(visit, updatedConsult, opts.handoff);
  const diagnosisSummary = String(
    consult.diagnosis.primaryDiagnosis ?? consult.diagnosis.clinicalImpression ?? "Consult complete",
  );

  let nextStage = needsCounsellor ? "awaiting_counsellor" : "completed";
  let routingNote = visit.routingNote;
  let ipdAdmissionId = visit.ipdAdmissionId;

  if (opts.treatmentMode === "ipd" && !needsCounsellor) {
    nextStage = "ipd_admitted";
    routingNote =
      routingNote ??
      "Doctor recommended IPD admission — nursing intake, vitals, and consent required.";
  }

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({
      where: { visitId },
      data: {
        status: "completed",
        completedAt,
        treatmentMode: opts.treatmentMode,
        recommendCounsellor: opts.recommendCounsellor,
        skipCounsellor: opts.skipCounsellor,
        packageId: updatedConsult.packageId,
        counsellorNotes: updatedConsult.counsellorNotes,
        doctorAdvice: updatedConsult.doctorAdvice,
        handoff: opts.handoff,
        whatsappRxSent: opts.sendWhatsapp,
      },
    });

    if (opts.treatmentMode === "ipd") {
      ipdAdmissionId = `ipd_${visitId}`;
      await tx.ipdAdmission.upsert({
        where: { visitId },
        update: {
          diagnosis: diagnosisSummary,
          attendingDoctorId: doctorId,
          status: "admitted",
        },
        create: {
          id: ipdAdmissionId,
          visitId,
          patientId: visit.patientId,
          ward: String(opts.handoff.ward ?? "MSK Ward A"),
          bed: String(opts.handoff.bed ?? "A-14"),
          admittedAt: new Date().toISOString().slice(0, 10),
          diagnosis: diagnosisSummary,
          attendingDoctorId: doctorId,
          status: "admitted",
        },
      });
    }

    await tx.opdVisit.update({
      where: { id: visitId },
      data: {
        stage: nextStage,
        treatmentPath: opts.treatmentMode === "ipd" ? "ipd" : visit.treatmentPath,
        ipdAdmissionId: ipdAdmissionId ?? undefined,
        routingNote,
      },
    });

    if (needsCounsellor) {
      const doctorName = visit.doctorName ?? doctorId;
      await tx.counsellorQueueItem.upsert({
        where: { visitId },
        update: {
          patientId: visit.patientId,
          doctorId,
          doctorName: String(doctorName),
          sentAt: completedAt,
          treatmentMode: opts.treatmentMode,
          packageId,
          packageLabel: pkg?.label ?? null,
          priority,
          payload: updatedConsult,
        },
        create: {
          id: `cq_${visitId}`,
          visitId,
          patientId: visit.patientId,
          doctorId,
          doctorName: String(doctorName),
          sentAt: completedAt,
          treatmentMode: opts.treatmentMode,
          packageId,
          packageLabel: pkg?.label ?? null,
          priority,
          payload: updatedConsult,
        },
      });
    }
  });

  const updatedOpd = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (updatedOpd) await syncVisitFromOpdVisit(ctx, updatedOpd);

  if (consult.prescription?.length) {
    const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
    const { pushPrescriptionToPharmacy } = await import("@/server/pharmacy-rx-bridge");
    await pushPrescriptionToPharmacy(ctx, {
      visitId,
      patientId: visit.patientId,
      patientName: patient?.name ?? patient?.fullName ?? "Patient",
      uhid: patient?.uhid ?? "",
      doctorId,
      doctorName: visit.doctorName ?? doctorId,
      lines: consult.prescription as PrescriptionLine[],
    });
  }

  if (opts.sendWhatsapp && consult.prescription?.length) {
    const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
    if (patient?.phone) {
      await notifyPrescriptionWhatsapp(ctx, {
        patientName: patient.name ?? patient.fullName ?? "Patient",
        phone: patient.phone,
        visitId,
        lineCount: consult.prescription.length,
      });
    }
  }

  await writePlatformAudit({
    ctx,
    module: "doctor",
    action: "consult_completed",
    entityType: "visit",
    entityId: visitId,
    summary: needsCounsellor
      ? `Consult completed — sent to counsellor (${opts.treatmentMode})`
      : `Consult completed (${opts.treatmentMode})`,
    severity: priority === "high" ? "warning" : "info",
    payload: { treatmentMode: opts.treatmentMode, priority },
  });
}

export async function createDoctorTemplate(
  ctx: ServerContext,
  doctorId: string,
  tpl: Omit<DoctorTemplate, "id" | "doctorId">,
) {
  await resolveDoctorIdForContext(ctx);
  const id = `tpl_custom_${Date.now()}`;
  await prisma.doctorTemplate.create({
    data: {
      id,
      doctorId,
      label: tpl.label,
      disease: tpl.disease,
      diagnosis: tpl.diagnosis,
      treatment: tpl.treatment,
      prescription: tpl.prescription,
      isSystem: false,
    },
  });
  await writePlatformAudit({
    ctx,
    module: "doctor",
    action: "template_created",
    entityType: "doctor_template",
    entityId: id,
    summary: `Template created: ${tpl.label}`,
  });
  return id;
}

export async function updateDoctorTemplate(ctx: ServerContext, id: string, patch: Partial<DoctorTemplate>) {
  await resolveDoctorIdForContext(ctx);
  await prisma.doctorTemplate.update({
    where: { id },
    data: {
      label: patch.label,
      disease: patch.disease,
      diagnosis: patch.diagnosis,
      treatment: patch.treatment,
      prescription: patch.prescription,
    },
  });
}

export async function deleteDoctorTemplate(ctx: ServerContext, id: string) {
  await resolveDoctorIdForContext(ctx);
  await prisma.doctorTemplate.deleteMany({ where: { id, isSystem: false } });
  await writePlatformAudit({
    ctx,
    module: "doctor",
    action: "template_deleted",
    entityType: "doctor_template",
    entityId: id,
    summary: `Template deleted: ${id}`,
  });
}

export async function saveIpdRound(
  ctx: ServerContext,
  ipdId: string,
  note: Record<string, string | number | boolean>,
) {
  const doctorId = await resolveDoctorIdForContext(ctx);
  const ipd = await prisma.ipdAdmission.findUnique({ where: { id: ipdId } });
  if (!ipd) throw new ServerActionError("NOT_FOUND", "IPD admission not found.");
  await requireDoctorVisit(ctx, ipd.visitId);
  if (ipd.attendingDoctorId !== doctorId && doctorId !== DEMO_DOCTOR_ID) {
    throw new ServerActionError("FORBIDDEN", "You are not the attending doctor for this admission.");
  }

  const text = `S: ${note.subjective}\nO: ${note.objective}\nA: ${note.assessment}\nP: ${note.plan}`;
  const now = new Date().toISOString();

  await prisma.$transaction([
    prisma.ipdAdmission.update({
      where: { id: ipdId },
      data: { lastRoundAt: now, lastRoundNote: text },
    }),
    prisma.formSubmission.create({
      data: {
        id: `ipd_round_${ipdId}_${Date.now()}`,
        formId: "doctor-ipd-round",
        patientId: ipd.patientId,
        visitId: ipd.visitId,
        data: note,
        submittedAt: now,
      },
    }),
  ]);

  await writePlatformAudit({
    ctx,
    module: "doctor",
    action: "ipd_round_saved",
    entityType: "ipd_admission",
    entityId: ipdId,
    summary: `Ward round recorded for ${ipd.ward} bed ${ipd.bed}`,
  });
}

export async function getIpdRoundHistory(ctx: ServerContext, ipdId: string): Promise<IpdRoundRecord[]> {
  const ipd = await prisma.ipdAdmission.findUnique({ where: { id: ipdId } });
  if (!ipd) return [];
  await requireDoctorVisit(ctx, ipd.visitId);

  const rows = await prisma.formSubmission.findMany({
    where: { formId: "doctor-ipd-round", visitId: ipd.visitId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => {
    const data = asRecord(row.data);
    return {
      id: row.id,
      at: row.submittedAt,
      data,
      note: `S: ${data.subjective ?? ""}\nO: ${data.objective ?? ""}\nA: ${data.assessment ?? ""}\nP: ${data.plan ?? ""}`,
    };
  });
}

export async function listDoctorAuditLogs(
  ctx: ServerContext,
  input: { limit?: number; cursor?: string },
) {
  const limit = Math.min(100, Math.max(10, input.limit ?? 50));
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      module: "doctor",
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actor: r.actor,
    actorRole: r.actorRole ?? "",
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    severity: r.severity,
  }));
}

export async function addDocumentTemplate(
  ctx: ServerContext,
  kind: DocumentTemplate["kind"],
  label: string,
  description: string,
) {
  await resolveDoctorIdForContext(ctx);
  await prisma.documentTemplate.create({
    data: {
      id: `doc_custom_${Date.now()}`,
      kind,
      label,
      layout: "navayu-letterhead",
      description,
      enabled: true,
      isSystem: false,
    },
  });
}

export async function saveDocumentTemplate(ctx: ServerContext, template: DocumentTemplate) {
  await resolveDoctorIdForContext(ctx);
  await prisma.documentTemplate.upsert({
    where: { id: template.id },
    update: {
      kind: template.kind,
      label: template.label,
      layout: template.layout,
      description: template.description,
      enabled: template.enabled,
      isSystem: template.isSystem,
    },
    create: {
      id: template.id,
      kind: template.kind,
      label: template.label,
      layout: template.layout,
      description: template.description,
      enabled: template.enabled,
      isSystem: template.isSystem,
    },
  });
}
