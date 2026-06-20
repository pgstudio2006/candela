import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { Appointment as StoreAppointment } from "@/lib/frontdesk-workflow";
import {
  computeWaitMinutes,
  isRedFlagVisit,
  patientDisplayName,
  sortQueueVisits,
} from "@/lib/frontdesk-workflow";

export type ShiftHandoverReport = {
  generatedAt: string;
  shiftDate: string;
  summary: {
    arrivals: number;
    checkedIn: number;
    billedPaid: number;
    inQueue: number;
    withDoctor: number;
    redFlags: number;
    cancelledAppointments: number;
    revenueCollected: number;
  };
  queueByDoctor: { doctorName: string; waiting: number; nextToken?: number; longestWaitMin: number }[];
  pendingBilling: { patientName: string; uhid: string; stage: string; href: string }[];
  redFlagVisits: { patientName: string; uhid: string; note: string; href: string }[];
  openJuniorExams: { patientName: string; token?: number; href: string }[];
};

export function buildShiftHandoverReport(
  visits: Visit[],
  patients: Patient[],
  appointments: StoreAppointment[],
): ShiftHandoverReport {
  const today = new Date().toISOString().slice(0, 10);
  const todayVisits = visits.filter((v) => v.checkInAt || v.stage !== "registered");
  const inQueue = sortQueueVisits(
    visits.filter((v) => ["queued", "junior_exam"].includes(v.stage)),
  );
  const getPatient = (id: string) => patients.find((p) => p.id === id);

  const doctorMap = new Map<string, Visit[]>();
  for (const v of inQueue) {
    const key = v.doctorName || v.doctorId || "Unassigned";
    const list = doctorMap.get(key) ?? [];
    list.push(v);
    doctorMap.set(key, list);
  }

  const queueByDoctor = [...doctorMap.entries()].map(([doctorName, list]) => {
    const waits = list.map((v) => (v.checkInAt ? computeWaitMinutes(v.checkInAt) : v.waitMin));
    return {
      doctorName,
      waiting: list.length,
      nextToken: list[0]?.token,
      longestWaitMin: waits.length ? Math.max(...waits) : 0,
    };
  });

  const pendingBilling = visits
    .filter((v) => v.stage === "billing" || (v.stage === "checked_in" && v.billing === "pending"))
    .map((v) => {
      const p = getPatient(v.patientId);
      return {
        patientName: p ? patientDisplayName(p) : "Unknown",
        uhid: p?.uhid ?? "—",
        stage: v.stage,
        href: `/app/frontdesk/billing?visit=${v.id}`,
      };
    });

  const redFlagVisits = visits
    .filter(isRedFlagVisit)
    .map((v) => {
      const p = getPatient(v.patientId);
      return {
        patientName: p ? patientDisplayName(p) : "Unknown",
        uhid: p?.uhid ?? "—",
        note: v.routingNote ?? "Red flag escalation",
        href: `/app/frontdesk/junior-exam/${v.id}`,
      };
    });

  const openJuniorExams = visits
    .filter((v) => v.stage === "junior_exam" && v.exam !== "done")
    .map((v) => {
      const p = getPatient(v.patientId);
      return {
        patientName: p ? patientDisplayName(p) : "Unknown",
        token: v.token,
        href: `/app/frontdesk/junior-exam/${v.id}`,
      };
    });

  const revenueCollected = todayVisits
    .filter((v) => v.billing === "paid" && v.billAmount)
    .reduce((s, v) => s + (v.billAmount ?? 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    shiftDate: today,
    summary: {
      arrivals: todayVisits.length,
      checkedIn: todayVisits.filter((v) => v.stage !== "registered").length,
      billedPaid: todayVisits.filter((v) => v.billing === "paid" || v.billing === "deferred").length,
      inQueue: inQueue.length,
      withDoctor: visits.filter((v) => v.stage === "with_doctor").length,
      redFlags: redFlagVisits.length,
      cancelledAppointments: appointments.filter((a) => a.status === "cancelled" && a.date === today).length,
      revenueCollected,
    },
    queueByDoctor,
    pendingBilling,
    redFlagVisits,
    openJuniorExams,
  };
}
