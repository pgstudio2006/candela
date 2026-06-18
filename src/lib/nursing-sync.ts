import type { NursingHandoffPayload } from "@/design-system/nurse-data";
import type { ConsultationRecord } from "@/design-system/doctor-data";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import { loadClinicalCore } from "@/lib/clinical-shared";
import { getBillingHandoff } from "@/lib/counsellor-sync";

export const NURSING_HANDOFFS_KEY = "candela-nursing-handoffs";
const DOCTOR_STORAGE_KEY = "candela-doctor-v1";

export function loadNursingHandoffs(): NursingHandoffPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NURSING_HANDOFFS_KEY);
    if (raw) return JSON.parse(raw) as NursingHandoffPayload[];
  } catch {
    /* empty */
  }
  return seedFromVisits();
}

function loadConsultation(visitId: string): ConsultationRecord | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { consultations?: ConsultationRecord[] };
      return parsed.consultations?.find((c) => c.visitId === visitId);
    }
  } catch {
    /* empty */
  }
  return undefined;
}

function seedFromVisits(): NursingHandoffPayload[] {
  const core = loadClinicalCore();
  const waiting = core.visits.filter(
    (v) => v.stage === "nursing_queue" || (v.stage === "ipd_admitted" && v.treatmentPath === "ipd"),
  );
  if (waiting.length === 0) return [];

  return waiting.map((v) => {
    const patient = core.patients.find((p) => p.id === v.patientId);
    const billing = getBillingHandoff(v.id);
    const consult = loadConsultation(v.id);
    return {
      visitId: v.id,
      patientId: v.patientId,
      patientName: patient?.name ?? "Patient",
      uhid: patient?.uhid ?? "",
      doctorId: v.doctorId,
      doctorName: v.doctorName,
      treatmentPath: v.treatmentPath ?? (v.stage === "ipd_admitted" ? "ipd" : "opd"),
      packageId: billing?.quote.packageId ?? "pkg_basic",
      packageLabel: v.counselPackageLabel ?? billing?.quote.packageLabel ?? "Care package",
      billingStatus: v.billing,
      amountPaid: v.amountPaid ?? 0,
      balanceDue: v.balanceDue,
      netAmount: v.billAmount ?? billing?.quote.netAmount ?? 0,
      commercialConsent: billing?.quote.consentCaptured ?? false,
      billingHandoff: billing,
      consultation: consult,
      sentAt: new Date().toISOString(),
    };
  });
}

export function saveNursingHandoff(handoff: NursingHandoffPayload) {
  const all = loadNursingHandoffs().filter((h) => h.visitId !== handoff.visitId);
  all.push(handoff);
  localStorage.setItem(NURSING_HANDOFFS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("candela-nursing-handoff-updated"));
}

export function removeNursingHandoff(visitId: string) {
  const all = loadNursingHandoffs().filter((h) => h.visitId !== visitId);
  localStorage.setItem(NURSING_HANDOFFS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("candela-nursing-handoff-updated"));
}

export function getNursingHandoff(visitId: string) {
  return loadNursingHandoffs().find((h) => h.visitId === visitId);
}

export function buildNursingHandoffFromBilling(input: {
  visitId: string;
  patientId: string;
  patientName: string;
  uhid: string;
  doctorId: string;
  doctorName: string;
  treatmentPath: NursingHandoffPayload["treatmentPath"];
  packageId: string;
  packageLabel: string;
  billingStatus: string;
  amountPaid: number;
  balanceDue?: number;
  netAmount: number;
  commercialConsent: boolean;
  billingHandoff?: BillingHandoffPayload;
  ipdWard?: string;
  ipdBed?: string;
}): NursingHandoffPayload {
  const consult = loadConsultation(input.visitId);
  return {
    ...input,
    consultation: consult,
    sentAt: new Date().toISOString(),
  };
}
