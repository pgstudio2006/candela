import type { ConsultationRecord, CounsellorQueueItem, DoctorTemplate, IpdPatient, PrescriptionLine, TreatmentMode } from "@/design-system/doctor-data";
import { CARE_PACKAGES, DEMO_DOCTOR_ID } from "@/design-system/doctor-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { DocumentTemplate } from "@/design-system/document-templates";
import { prisma } from "@/lib/prisma";
import { getClinicalSnapshot } from "@/server/clinical";
import { resolveDoctorIdForContext } from "@/server/clinical/roster";
import { ServerActionError } from "@/server/errors";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

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
};

async function loadCarePackages() {
  const depts = await prisma.adminDepartment.findMany({ where: { active: true } });
  const ids = new Set(depts.flatMap((d) => (Array.isArray(d.defaultPackageIds) ? d.defaultPackageIds : [])));
  const fromSeed = CARE_PACKAGES.filter((p) => ids.has(p.id) || ids.size === 0);
  return fromSeed.length ? fromSeed : CARE_PACKAGES;
}

export async function getDoctorSnapshot(activeDoctorId = DEMO_DOCTOR_ID, ctx?: import("@/server/context").ServerContext): Promise<DoctorSnapshot> {
  const [clinical, consultRows, queueRows, ipdRows, templateRows, docRows, packages] = await Promise.all([
    ctx ? getClinicalSnapshot(ctx) : getClinicalSnapshot(await (async () => {
      const { getServerContext } = await import("@/server/context");
      return getServerContext();
    })()),
    prisma.consultation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.counsellorQueueItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.ipdAdmission.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.doctorTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.documentTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    loadCarePackages(),
  ]);

  return {
    patients: clinical.patients,
    visits: clinical.visits,
    activeDoctorId,
    consultations: consultRows.map(mapConsultation),
    counsellorQueue: queueRows.map((row) => ({
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
    ipdPatients: ipdRows.map((row) => ({
      id: row.id,
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
  };
}

export async function startConsultation(visitId: string, doctorId: string, ctx?: import("@/server/context").ServerContext) {
  const visit = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (!visit) return null;

  if (ctx) {
    const resolved = await resolveDoctorIdForContext(ctx);
    doctorId = resolved;
  }
  if (visit.doctorId && visit.doctorId !== doctorId) {
    throw new ServerActionError(
      "FORBIDDEN",
      "This visit is assigned to another doctor.",
    );
  }

  const existing = await prisma.consultation.findUnique({ where: { visitId } });
  if (existing) return mapConsultation(existing);

  const juniorExam = await prisma.formSubmission.findFirst({
    where: { formId: "junior-exam", visitId },
    orderBy: { createdAt: "desc" },
  });
  const junior = asRecord(juniorExam?.data);

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
      examination: {
        chiefComplaint: String(junior.chiefComplaint ?? ""),
        mskExam: String(junior.juniorImpression ?? ""),
        specialTests: String(junior.specialTests ?? ""),
        historyPresent: String(junior.duration ?? ""),
      },
      diagnosis: { clinicalImpression: String(junior.juniorImpression ?? "") },
      treatment: { plan: String(junior.seniorHandoff ?? "") },
      prescription: [],
      notes: String(junior.seniorHandoff ?? ""),
    },
  });

  return mapConsultation(created);
}

export async function updateConsultation(visitId: string, patch: Partial<ConsultationRecord>) {
  await prisma.consultation.update({
    where: { visitId },
    data: {
      completedAt: patch.completedAt,
      status: patch.status,
      treatmentMode: patch.treatmentMode,
      recommendCounsellor: patch.recommendCounsellor,
      skipCounsellor: patch.skipCounsellor,
      packageId: patch.packageId,
      counsellorNotes: patch.counsellorNotes,
      doctorAdvice: patch.doctorAdvice,
      whatsappRxSent: patch.whatsappRxSent,
      examination: patch.examination,
      diagnosis: patch.diagnosis,
      treatment: patch.treatment,
      prescription: patch.prescription,
      notes: patch.notes,
      scribeTranscript: patch.scribeTranscript,
      scribeLanguage: patch.scribeLanguage,
      scribeAppliedAt: patch.scribeAppliedAt,
      templateId: patch.templateId,
      handoff: patch.handoff,
    },
  });
}

export async function saveConsultSection(
  visitId: string,
  section: "examination" | "diagnosis" | "treatment",
  data: Record<string, string | number | boolean>,
) {
  const existing = await prisma.consultation.findUnique({ where: { visitId } });
  if (!existing) return;
  const nextSection = {
    ...asRecord(existing[section]),
    ...data,
  };
  await prisma.consultation.update({
    where: { visitId },
    data: { [section]: nextSection },
  });
}

export async function setPrescription(visitId: string, lines: PrescriptionLine[]) {
  await prisma.consultation.update({
    where: { visitId },
    data: { prescription: lines },
  });
}

export async function completeConsultation(
  visitId: string,
  opts: {
    treatmentMode: TreatmentMode;
    recommendCounsellor: boolean;
    skipCounsellor: boolean;
    handoff: Record<string, string | number | boolean>;
    sendWhatsapp: boolean;
  },
  ctx?: import("@/server/context").ServerContext,
) {
  const consult = await prisma.consultation.findUnique({ where: { visitId } });
  const visit = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (!consult || !visit) {
    throw new ServerActionError("NOT_FOUND", "Consultation or visit not found.");
  }

  const packageId = String(opts.handoff.packageId ?? "");
  const pkg = CARE_PACKAGES.find((p) => p.id === packageId);
  const updatedConsult = {
    ...mapConsultation(consult),
    status: "completed" as const,
    completedAt: new Date().toISOString(),
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

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({
      where: { visitId },
      data: {
        status: "completed",
        completedAt: updatedConsult.completedAt,
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

    await tx.opdVisit.update({
      where: { id: visitId },
      data: {
        stage: needsCounsellor ? "awaiting_counsellor" : "completed",
      },
    });

    if (needsCounsellor) {
      const doctorId = visit.doctorId ?? consult.doctorId;
      const doctorName = visit.doctorName ?? consult.doctorId;
      await tx.counsellorQueueItem.upsert({
        where: { visitId },
        update: {
          patientId: visit.patientId,
          doctorId,
          doctorName: String(doctorName),
          sentAt: updatedConsult.completedAt,
          treatmentMode: opts.treatmentMode,
          packageId,
          packageLabel: pkg?.label ?? null,
          priority: String(opts.handoff.conversionPriority ?? "") === "high" ? "high" : "normal",
          payload: updatedConsult,
        },
        create: {
          id: `cq_${visitId}`,
          visitId,
          patientId: visit.patientId,
          doctorId,
          doctorName: String(doctorName),
          sentAt: updatedConsult.completedAt,
          treatmentMode: opts.treatmentMode,
          packageId,
          packageLabel: pkg?.label ?? null,
          priority: String(opts.handoff.conversionPriority ?? "") === "high" ? "high" : "normal",
          payload: updatedConsult,
        },
      });
    }
  });

  if (ctx && consult.prescription && Array.isArray(consult.prescription) && consult.prescription.length) {
    const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
    const { pushPrescriptionToPharmacy } = await import("@/server/pharmacy-rx-bridge");
    await pushPrescriptionToPharmacy(ctx, {
      visitId,
      patientId: visit.patientId,
      patientName: patient?.name ?? patient?.fullName ?? "Patient",
      uhid: patient?.uhid ?? "",
      doctorId: visit.doctorId ?? consult.doctorId,
      doctorName: visit.doctorName ?? consult.doctorId,
      lines: consult.prescription as PrescriptionLine[],
    });
  }
}

export async function createDoctorTemplate(doctorId: string, tpl: Omit<DoctorTemplate, "id" | "doctorId">) {
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
  return id;
}

export async function updateDoctorTemplate(id: string, patch: Partial<DoctorTemplate>) {
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

export async function deleteDoctorTemplate(id: string) {
  await prisma.doctorTemplate.deleteMany({ where: { id, isSystem: false } });
}

export async function saveIpdRound(ipdId: string, note: Record<string, string | number | boolean>) {
  const text = `S: ${note.subjective}\nO: ${note.objective}\nA: ${note.assessment}\nP: ${note.plan}`;
  await prisma.ipdAdmission.update({
    where: { id: ipdId },
    data: {
      lastRoundAt: new Date().toISOString(),
      lastRoundNote: text,
    },
  });
}

export async function addDocumentTemplate(kind: DocumentTemplate["kind"], label: string, description: string) {
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

export async function saveDocumentTemplate(template: DocumentTemplate) {
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
