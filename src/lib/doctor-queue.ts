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

/** Whether a visit belongs in this doctor's workspace snapshot (not just queue ordering). */
export function visitVisibleInDoctorWorkspace(
  visit: Visit,
  doctorId: string,
  departmentIds: readonly string[],
  consultVisitIds: ReadonlySet<string>,
): boolean {
  if (consultVisitIds.has(visit.id)) return true;
  if (visit.doctorId === doctorId) return true;
  if (visit.stage !== "with_doctor") return false;
  if (visit.exam !== "done") return false;
  const deptSet = new Set(departmentIds);
  return deptSet.has(visit.departmentId);
}

export function filterDoctorOpdQueue(
  visits: Visit[],
  doctorId?: string,
  includeDept = false,
  departmentIds: readonly string[] = [],
): Visit[] {
  const deptSet = new Set(departmentIds);
  const filtered = visits.filter((v) => {
    if (v.stage !== "with_doctor") return false;
    if (includeDept || !doctorId) return true;
    if (v.doctorId === doctorId) return true;
    if (v.exam === "done" && deptSet.has(v.departmentId)) return true;
    return false;
  });
  return sortDoctorOpdQueue(filtered);
}

export function isJuniorHandoffReady(visit: Visit): boolean {
  return visit.stage === "with_doctor" && visit.exam === "done";
}
