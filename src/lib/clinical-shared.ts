/** Shared patient/visit state — Front Desk writes, Doctor reads/writes */

import {
  PATIENTS as SEED_PATIENTS,
  VISITS as SEED_VISITS,
  type Patient,
  type Visit,
} from "@/design-system/frontdesk-data";

export const CLINICAL_STORAGE_KEY = "candela-frontdesk-v1";

export type ClinicalCounters = {
  patient: number;
  visit: number;
  token: number;
  appointment: number;
};

export type ClinicalCore = {
  patients: Patient[];
  visits: Visit[];
  counters: ClinicalCounters;
};

export function loadClinicalCore(): ClinicalCore {
  if (typeof window === "undefined") {
    return {
      patients: structuredClone(SEED_PATIENTS),
      visits: structuredClone(SEED_VISITS),
      counters: { patient: 46, visit: 5, token: 16, appointment: 1 },
    };
  }
  try {
    const raw = localStorage.getItem(CLINICAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClinicalCore & { appointments?: unknown };
      return {
        patients: parsed.patients ?? SEED_PATIENTS,
        visits: parsed.visits ?? SEED_VISITS,
        counters: parsed.counters ?? { patient: 46, visit: 5, token: 16, appointment: 1 },
      };
    }
  } catch {
    /* seed */
  }
  return {
    patients: structuredClone(SEED_PATIENTS),
    visits: structuredClone(SEED_VISITS),
    counters: { patient: 46, visit: 5, token: 16, appointment: 1 },
  };
}

export function saveClinicalCore(core: ClinicalCore, extra?: Record<string, unknown>) {
  const existing = typeof window !== "undefined" ? localStorage.getItem(CLINICAL_STORAGE_KEY) : null;
  const merged = existing ? { ...JSON.parse(existing), ...core, ...extra } : { ...core, ...extra };
  localStorage.setItem(CLINICAL_STORAGE_KEY, JSON.stringify(merged));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-clinical-updated"));
  }
}
