"use server";

import type { ConsentRecord, VitalsRecord } from "@/design-system/nurse-data";
import { requireModule } from "@/server/auth";
import {
  claimEpisode,
  completeEpisode,
  completeSession,
  declineConsent,
  getNurseSnapshot,
  presentConsent,
  saveVitals,
  signConsent,
  startSession,
  updateEpisodeNotes,
  uploadConsent,
  verifyConsent,
} from "@/server/nurse";

export async function getNurseSnapshotAction() {
  const ctx = await requireModule("nurse");
  return getNurseSnapshot(ctx);
}

export async function claimEpisodeAction(visitId: string) {
  const ctx = await requireModule("nurse");
  return claimEpisode(visitId, ctx);
}

export async function saveVitalsAction(
  visitId: string,
  vitals: Omit<VitalsRecord, "visitId" | "recordedAt" | "recordedBy">,
) {
  const ctx = await requireModule("nurse");
  return saveVitals(visitId, vitals, ctx);
}

export async function presentConsentAction(visitId: string, consentId: string) {
  await requireModule("nurse");
  return presentConsent(visitId, consentId);
}

export async function signConsentAction(
  visitId: string,
  consentId: string,
  data: { signatureDataUrl: string; signerName: string; signerRole: ConsentRecord["signerRole"]; witnessName?: string },
) {
  await requireModule("nurse");
  return signConsent(visitId, consentId, data);
}

export async function uploadConsentAction(
  visitId: string,
  consentId: string,
  data: { uploadDataUrl: string; uploadFileName: string; signerName: string },
) {
  await requireModule("nurse");
  return uploadConsent(visitId, consentId, data);
}

export async function verifyConsentAction(visitId: string, consentId: string) {
  await requireModule("nurse");
  return verifyConsent(visitId, consentId);
}

export async function declineConsentAction(visitId: string, consentId: string, reason: string) {
  await requireModule("nurse");
  return declineConsent(visitId, consentId, reason);
}

export async function startSessionAction(visitId: string, bay: string) {
  await requireModule("nurse");
  return startSession(visitId, bay);
}

export async function completeSessionAction(visitId: string, sessionId: string, notes?: string) {
  await requireModule("nurse");
  return completeSession(visitId, sessionId, notes);
}

export async function completeEpisodeAction(visitId: string) {
  await requireModule("nurse");
  return completeEpisode(visitId);
}

export async function updateEpisodeNotesAction(visitId: string, notes: string) {
  await requireModule("nurse");
  return updateEpisodeNotes(visitId, notes);
}
