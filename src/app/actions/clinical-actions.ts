"use server";

import type { BillingResult, CounselBillingInput } from "@/server/clinical";
import {
  bookAppointment,
  canOverrideDuplicate,
  checkDuplicatePatient,
  checkInVisit,
  completeJuniorExam,
  fetchVisitReceipt,
  getClinicalSnapshot,
  processBilling,
  processCounselBilling,
  registerPatient,
  saveSubmission,
} from "@/server/clinical";
import { requireModule } from "@/server/auth";

export async function getClinicalSnapshotAction() {
  const ctx = await requireModule("frontdesk");
  return getClinicalSnapshot(ctx);
}

export async function registerPatientAction(input: {
  data: Record<string, string | number | boolean>;
  patientId: string;
  visitId?: string;
  startVisit?: boolean;
  forceDuplicate?: boolean;
}) {
  const ctx = await requireModule("frontdesk");
  return registerPatient(ctx, input);
}

export async function checkDuplicatePatientAction(phone: string, uhid?: string) {
  const ctx = await requireModule("frontdesk");
  return checkDuplicatePatient(ctx, phone, uhid);
}

export async function canOverrideDuplicateAction() {
  const ctx = await requireModule("frontdesk");
  return canOverrideDuplicate(ctx.role);
}

export async function checkInVisitAction(input: {
  data: Record<string, string | number | boolean>;
  existingVisitId?: string;
  newVisitId?: string;
}) {
  const ctx = await requireModule("frontdesk");
  return checkInVisit(ctx, input);
}

export async function processBillingAction(
  visitId: string,
  data: Record<string, string | number | boolean>,
): Promise<BillingResult> {
  const ctx = await requireModule("frontdesk");
  return processBilling(ctx, visitId, data);
}

export async function processCounselBillingAction(
  visitId: string,
  input: CounselBillingInput,
): Promise<BillingResult> {
  const ctx = await requireModule("frontdesk");
  return processCounselBilling(ctx, visitId, input);
}

export async function completeJuniorExamAction(
  visitId: string,
  data?: Record<string, string | number | boolean>,
) {
  const ctx = await requireModule("frontdesk");
  return completeJuniorExam(ctx, visitId, data);
}

export async function bookAppointmentAction(input: {
  data: Record<string, string | number | boolean>;
  appointmentId: string;
  visitId: string;
}) {
  const ctx = await requireModule("frontdesk");
  return bookAppointment(ctx, input);
}

export async function saveSubmissionAction(
  formId: string,
  data: Record<string, string | number | boolean>,
  ctx?: { patientId?: string; visitId?: string },
) {
  await requireModule("frontdesk");
  return saveSubmission(formId, data, ctx);
}

export async function getVisitReceiptAction(visitId: string) {
  const ctx = await requireModule("frontdesk");
  try {
    const receipt = await fetchVisitReceipt(ctx, visitId);
    return { receipt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load receipt.";
    return { error: message };
  }
}
