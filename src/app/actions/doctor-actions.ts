"use server";

import type { DoctorTemplate, PrescriptionLine, TreatmentMode } from "@/design-system/doctor-data";
import type { DocumentTemplate } from "@/design-system/document-templates";
import { requireModule } from "@/server/auth";
import {
  addDocumentTemplate,
  completeConsultation,
  createDoctorTemplate,
  deleteDoctorTemplate,
  getDoctorSnapshot,
  saveConsultSection,
  saveDocumentTemplate,
  saveIpdRound,
  setPrescription,
  startConsultation,
  updateConsultation,
  updateDoctorTemplate,
} from "@/server/doctor";

export async function getDoctorSnapshotAction(activeDoctorId?: string) {
  const ctx = await requireModule("doctor");
  return getDoctorSnapshot(activeDoctorId, ctx);
}

export async function startConsultationAction(visitId: string, doctorId: string) {
  await requireModule("doctor");
  return startConsultation(visitId, doctorId);
}

export async function updateConsultationAction(visitId: string, patch: Record<string, unknown>) {
  await requireModule("doctor");
  return updateConsultation(visitId, patch as Parameters<typeof updateConsultation>[1]);
}

export async function saveConsultSectionAction(
  visitId: string,
  section: "examination" | "diagnosis" | "treatment",
  data: Record<string, string | number | boolean>,
) {
  await requireModule("doctor");
  return saveConsultSection(visitId, section, data);
}

export async function setPrescriptionAction(visitId: string, lines: PrescriptionLine[]) {
  await requireModule("doctor");
  return setPrescription(visitId, lines);
}

export async function completeConsultationAction(
  visitId: string,
  opts: {
    treatmentMode: TreatmentMode;
    recommendCounsellor: boolean;
    skipCounsellor: boolean;
    handoff: Record<string, string | number | boolean>;
    sendWhatsapp: boolean;
  },
) {
  const ctx = await requireModule("doctor");
  return completeConsultation(visitId, opts, ctx);
}

export async function createDoctorTemplateAction(doctorId: string, tpl: Omit<DoctorTemplate, "id" | "doctorId">) {
  await requireModule("doctor");
  return createDoctorTemplate(doctorId, tpl);
}

export async function updateDoctorTemplateAction(id: string, patch: Partial<DoctorTemplate>) {
  await requireModule("doctor");
  return updateDoctorTemplate(id, patch);
}

export async function deleteDoctorTemplateAction(id: string) {
  await requireModule("doctor");
  return deleteDoctorTemplate(id);
}

export async function saveIpdRoundAction(ipdId: string, note: Record<string, string | number | boolean>) {
  await requireModule("doctor");
  return saveIpdRound(ipdId, note);
}

export async function addDocumentTemplateAction(kind: DocumentTemplate["kind"], label: string, description: string) {
  await requireModule("doctor");
  return addDocumentTemplate(kind, label, description);
}

export async function saveDocumentTemplateAction(template: DocumentTemplate) {
  await requireModule("doctor");
  return saveDocumentTemplate(template);
}
