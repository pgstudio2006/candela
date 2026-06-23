/** Legacy seed doctor ids — strip from DB and never show in production rosters. */
export const LEGACY_DEMO_DOCTOR_IDS = new Set(["dr_1", "dr_2", "dr_3"]);

export function isLegacyDemoDoctorId(doctorId: string | null | undefined): boolean {
  return Boolean(doctorId && LEGACY_DEMO_DOCTOR_IDS.has(doctorId));
}

export function stripLegacyDemoDoctorIds(doctorIds: string[]): string[] {
  return doctorIds.filter((id) => !LEGACY_DEMO_DOCTOR_IDS.has(id));
}
