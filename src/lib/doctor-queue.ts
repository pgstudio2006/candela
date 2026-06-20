import type { Visit } from "@/design-system/frontdesk-data";
import { isRedFlagVisit } from "@/lib/frontdesk-workflow";

/** Red-flag and appointment patients first, then FIFO by token. */
export function sortDoctorOpdQueue(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => {
    const aUrgent = isRedFlagVisit(a) ? 0 : a.appointment ? 1 : 2;
    const bUrgent = isRedFlagVisit(b) ? 0 : b.appointment ? 1 : 2;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return (a.token ?? 99_999) - (b.token ?? 99_999);
  });
}

export function filterDoctorOpdQueue(visits: Visit[], doctorId?: string, includeDept = false): Visit[] {
  const filtered = visits.filter((v) => {
    if (v.stage !== "with_doctor") return false;
    if (!doctorId || includeDept) return true;
    return v.doctorId === doctorId;
  });
  return sortDoctorOpdQueue(filtered);
}
