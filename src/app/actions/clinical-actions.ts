"use server";

import type { BillingResult, CounselBillingInput } from "@/server/clinical";
import {
  bookAppointment,
  checkInVisit,
  completeJuniorExam,
  getClinicalSnapshot,
  processBilling,
  processCounselBilling,
  registerPatient,
  saveSubmission,
} from "@/server/clinical";
import { requireModule } from "@/server/auth";

export async function getClinicalSnapshotAction() {
  await requireModule("frontdesk");
  return getClinicalSnapshot();
}

export async function registerPatientAction(input: {
  data: Record<string, string | number | boolean>;
  patientId: string;
  visitId?: string;
  startVisit?: boolean;
}) {
  await requireModule("frontdesk");
  return registerPatient(input);
}

export async function checkInVisitAction(input: {
  data: Record<string, string | number | boolean>;
  existingVisitId?: string;
  newVisitId?: string;
}) {
  await requireModule("frontdesk");
  return checkInVisit(input);
}

export async function processBillingAction(visitId: string, data: Record<string, string | number | boolean>): Promise<BillingResult> {
  await requireModule("frontdesk");
  return processBilling(visitId, data);
}

export async function processCounselBillingAction(visitId: string, input: CounselBillingInput): Promise<BillingResult> {
  await requireModule("frontdesk");
  return processCounselBilling(visitId, input);
}

export async function completeJuniorExamAction(visitId: string) {
  await requireModule("frontdesk");
  return completeJuniorExam(visitId);
}

export async function bookAppointmentAction(input: {
  data: Record<string, string | number | boolean>;
  appointmentId: string;
  visitId: string;
}) {
  await requireModule("frontdesk");
  return bookAppointment(input);
}

export async function saveSubmissionAction(
  formId: string,
  data: Record<string, string | number | boolean>,
  ctx?: { patientId?: string; visitId?: string },
) {
  await requireModule("frontdesk");
  return saveSubmission(formId, data, ctx);
}
