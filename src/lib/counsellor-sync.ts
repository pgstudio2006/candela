import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import type { ConsultationRecord, CounsellorQueueItem } from "@/design-system/doctor-data";
import { loadClinicalCore, saveClinicalCore } from "@/lib/clinical-shared";

const DOCTOR_STORAGE_KEY = "candela-doctor-v1";
export const BILLING_HANDOFFS_KEY = "candela-billing-handoffs";

function loadDoctorStorage(): { counsellorQueue?: CounsellorQueueItem[]; consultations?: ConsultationRecord[] } {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* empty */
  }
  return {};
}

export function loadDoctorCounsellorQueue(): CounsellorQueueItem[] {
  const stored = loadDoctorStorage().counsellorQueue ?? [];
  if (stored.length > 0) return stored;
  return seedQueueFromVisits();
}

function seedQueueFromVisits(): CounsellorQueueItem[] {
  const core = loadClinicalCore();
  const doctor = loadDoctorStorage();
  const consultations = doctor.consultations ?? [];
  const waiting = core.visits.filter((v) => v.stage === "awaiting_counsellor");
  if (waiting.length === 0) return [];

  return waiting.map((v) => {
    const consult = consultations.find((c) => c.visitId === v.id);
    const payload: ConsultationRecord = consult ?? {
      visitId: v.id,
      patientId: v.patientId,
      doctorId: v.doctorId,
      startedAt: new Date().toISOString(),
      status: "completed",
      treatmentMode: "opd",
      recommendCounsellor: true,
      skipCounsellor: false,
      whatsappRxSent: false,
      examination: { chiefComplaint: "Awaiting counsel — complete doctor consult for full payload" },
      diagnosis: { primaryDiagnosis: "Pending full record" },
      treatment: { plan: "See doctor handoff" },
      prescription: [],
      notes: "",
      handoff: { packageId: "pkg_basic", counsellorNotes: "Demo handoff" },
    };
    return {
      id: `cq_seed_${v.id}`,
      visitId: v.id,
      patientId: v.patientId,
      doctorId: v.doctorId,
      doctorName: v.doctorName,
      sentAt: consult?.completedAt ?? new Date().toISOString(),
      treatmentMode: payload.treatmentMode,
      packageId: String(payload.handoff?.packageId ?? payload.packageId ?? "pkg_basic"),
      packageLabel: undefined,
      priority: String(payload.handoff?.conversionPriority ?? "") === "high" ? "high" : "normal",
      payload,
    };
  });
}

export function saveDoctorCounsellorQueue(queue: CounsellorQueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.counsellorQueue = queue;
    localStorage.setItem(DOCTOR_STORAGE_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent("candela-counsellor-queue-updated"));
  } catch {
    /* ignore */
  }
}

export function removeFromDoctorQueue(visitId: string) {
  const queue = loadDoctorCounsellorQueue().filter((q) => q.visitId !== visitId);
  saveDoctorCounsellorQueue(queue);
}

export function loadBillingHandoffs(): BillingHandoffPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BILLING_HANDOFFS_KEY);
    if (raw) return JSON.parse(raw) as BillingHandoffPayload[];
  } catch {
    /* empty */
  }
  return [];
}

export function saveBillingHandoff(handoff: BillingHandoffPayload) {
  const all = loadBillingHandoffs().filter((h) => h.visitId !== handoff.visitId);
  all.push(handoff);
  localStorage.setItem(BILLING_HANDOFFS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("candela-billing-handoff-updated"));
}

export function getBillingHandoff(visitId: string) {
  return loadBillingHandoffs().find((h) => h.visitId === visitId);
}

export function removeBillingHandoff(visitId: string) {
  const all = loadBillingHandoffs().filter((h) => h.visitId !== visitId);
  localStorage.setItem(BILLING_HANDOFFS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("candela-billing-handoff-updated"));
}

export function setVisitStage(visitId: string, stage: string) {
  const core = loadClinicalCore();
  saveClinicalCore({
    ...core,
    visits: core.visits.map((v) => (v.id === visitId ? { ...v, stage: stage as typeof v.stage } : v)),
  });
}
