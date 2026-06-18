import { SEED_PHARMACY_STAFF, type PharmacyStaff } from "@/design-system/pharmacy-data";

export const PHARMACY_MANAGER_EMAIL = "pharmacy@navayu.in";

export const SEED_STAFF_PASSWORDS: Record<string, string> = {
  phm_opd: "opd2026",
  phm_pur: "purchase2026",
};

export function pharmacySeedStaff(): PharmacyStaff[] {
  return structuredClone(SEED_PHARMACY_STAFF);
}
