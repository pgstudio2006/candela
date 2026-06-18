import type { CrmActivity, CrmFollowUp, CrmLead } from "@/design-system/crm-data";
import type { CounselSession } from "@/design-system/counsellor-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import {
  SEED_BILLS as PHARMACY_SEED_BILLS,
  SEED_PRESCRIPTIONS,
  type PharmacyBill,
  type Prescription,
} from "@/design-system/pharmacy-data";
import { loadClinicalCore } from "@/lib/clinical-shared";

const PHARMACY_STORAGE_KEY = "candela-pharmacy-v1";
const COUNSELLOR_STORAGE_KEY = "candela-counsellor-v1";

export type HistoryEvent = {
  id: string;
  at: string;
  category: "crm" | "visit" | "billing" | "pharmacy" | "counselling" | "follow_up";
  title: string;
  detail: string;
  amount?: number;
  status?: string;
};

export type LeadBillingSummary = {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  visitCount: number;
  pharmacyTotal: number;
  pharmacyPaid: number;
};

export type LeadPatientHistory = {
  matchType: "patient_id" | "phone" | "name" | "visit" | "none";
  patient?: Patient;
  visits: Visit[];
  pharmacyRx: Prescription[];
  pharmacyBills: PharmacyBill[];
  counselSessions: CounselSession[];
  crmActivities: CrmActivity[];
  followUps: CrmFollowUp[];
  timeline: HistoryEvent[];
  billing: LeadBillingSummary;
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadPharmacySnapshot(): { prescriptions: Prescription[]; bills: PharmacyBill[] } {
  if (typeof window === "undefined") {
    return { prescriptions: structuredClone(SEED_PRESCRIPTIONS), bills: structuredClone(PHARMACY_SEED_BILLS) };
  }
  try {
    const raw = localStorage.getItem(PHARMACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { prescriptions?: Prescription[]; bills?: PharmacyBill[] };
      return {
        prescriptions: parsed.prescriptions ?? SEED_PRESCRIPTIONS,
        bills: parsed.bills ?? PHARMACY_SEED_BILLS,
      };
    }
  } catch {
    /* seed */
  }
  return { prescriptions: structuredClone(SEED_PRESCRIPTIONS), bills: structuredClone(PHARMACY_SEED_BILLS) };
}

function loadCounselSessions(): CounselSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COUNSELLOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sessions?: CounselSession[] };
      return parsed.sessions ?? [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function resolvePatientForLead(lead: CrmLead, patients: Patient[]): Patient | undefined {
  if (lead.patientId) {
    const byId = patients.find((p) => p.id === lead.patientId);
    if (byId) return byId;
  }
  if (lead.uhid) {
    const byUhid = patients.find((p) => p.uhid === lead.uhid);
    if (byUhid) return byUhid;
  }
  const phones = [lead.phone, lead.alternatePhone].filter(Boolean).map((p) => normalizePhone(p!));
  for (const patient of patients) {
    const patientPhone = normalizePhone(patient.phone);
    if (phones.includes(patientPhone)) return patient;
  }
  const leadName = normalizeName(lead.fullName);
  return patients.find((p) => normalizeName(p.name) === leadName);
}

function visitEvents(visits: Visit[]): HistoryEvent[] {
  return visits.map((v) => ({
    id: `visit-${v.id}`,
    at: v.checkInAt ? `2026-06-17T${v.checkInAt}:00` : new Date().toISOString(),
    category: v.billAmount ? "billing" : "visit",
    title: `Visit — ${v.doctorName || "Unassigned"}`,
    detail: [
      `Stage: ${v.stage.replace(/_/g, " ")}`,
      v.token != null ? `Token #${v.token}` : null,
      v.counselPackageLabel,
      v.routingNote,
      v.deferredReason ? `Deferred: ${v.deferredReason}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: v.billAmount,
    status: v.billing,
  }));
}

function pharmacyEvents(rx: Prescription[], bills: PharmacyBill[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  for (const p of rx) {
    events.push({
      id: `rx-${p.id}`,
      at: p.createdAt,
      category: "pharmacy",
      title: `Prescription — ${p.status.replace(/_/g, " ")}`,
      detail: `${p.lines.length} item(s) · Dr. ${p.doctorName} · ${p.source.toUpperCase()}`,
      status: p.status,
    });
  }
  for (const b of bills) {
    events.push({
      id: `ph-bill-${b.id}`,
      at: b.createdAt,
      category: "pharmacy",
      title: `Pharmacy bill ${b.id}`,
      detail: `${b.lines.length} item(s) · GST ₹${b.gstTotal.toFixed(0)}`,
      amount: b.total,
      status: b.paid ? "paid" : "pending",
    });
  }
  return events;
}

function counselEvents(sessions: CounselSession[]): HistoryEvent[] {
  return sessions.map((s) => ({
    id: `counsel-${s.id}`,
    at: s.completedAt ?? s.startedAt,
    category: "counselling",
    title: s.quote ? `Counselling — ${s.quote.packageLabel}` : "Counselling session",
    detail: [
      s.outcome ? `Outcome: ${s.outcome}` : "In progress",
      s.quote ? `Net ₹${s.quote.netAmount.toLocaleString("en-IN")}` : null,
      s.internalNotes ? s.internalNotes.slice(0, 80) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: s.quote?.netAmount,
    status: s.outcome,
  }));
}

function crmEvents(activities: CrmActivity[], followUps: CrmFollowUp[]): HistoryEvent[] {
  const acts = activities.map((a) => ({
    id: `crm-${a.id}`,
    at: a.at,
    category: "crm" as const,
    title: a.type.charAt(0).toUpperCase() + a.type.slice(1),
    detail: `${a.actor}: ${a.summary}`,
  }));
  const fus = followUps.map((f) => ({
    id: `fu-${f.id}`,
    at: f.scheduledAt,
    category: "follow_up" as const,
    title: `Follow-up (${f.channel})`,
    detail: [f.notes, f.outcome, `Status: ${f.status}`].filter(Boolean).join(" · "),
    status: f.status,
  }));
  return [...acts, ...fus];
}

function computeBilling(visits: Visit[], patient: Patient | undefined, pharmacyBills: PharmacyBill[]): LeadBillingSummary {
  const visitBilled = visits.reduce((n, v) => n + (v.billAmount ?? 0), 0);
  const visitPaid = visits.reduce((n, v) => n + (v.amountPaid ?? (v.billing === "paid" ? v.billAmount ?? 0 : 0)), 0);
  const visitOutstanding = visits.reduce((n, v) => n + (v.balanceDue ?? 0), 0);
  const pharmacyTotal = pharmacyBills.reduce((n, b) => n + b.total, 0);
  const pharmacyPaid = pharmacyBills.filter((b) => b.paid).reduce((n, b) => n + b.total, 0);
  const patientBalance = patient?.balance ?? 0;

  return {
    totalBilled: visitBilled + pharmacyTotal,
    totalPaid: visitPaid + pharmacyPaid,
    outstanding: Math.max(visitOutstanding, patientBalance) + pharmacyTotal - pharmacyPaid,
    visitCount: visits.length,
    pharmacyTotal,
    pharmacyPaid,
  };
}

export function buildLeadPatientHistory(
  lead: CrmLead,
  activities: CrmActivity[],
  followUps: CrmFollowUp[],
): LeadPatientHistory {
  const { patients, visits: allVisits } = loadClinicalCore();
  const { prescriptions, bills } = loadPharmacySnapshot();
  const allSessions = loadCounselSessions();

  const patient = resolvePatientForLead(lead, patients);
  let matchType: LeadPatientHistory["matchType"] = "none";

  if (lead.patientId && patient) matchType = "patient_id";
  else if (patient && [lead.phone, lead.alternatePhone].some((p) => p && normalizePhone(p) === normalizePhone(patient.phone))) {
    matchType = "phone";
  } else if (patient) matchType = "name";
  else if (lead.convertedVisitId) matchType = "visit";

  const patientVisits = patient
    ? allVisits.filter((v) => v.patientId === patient.id)
  : lead.convertedVisitId
    ? allVisits.filter((v) => v.id === lead.convertedVisitId)
    : [];

  const leadName = normalizeName(lead.fullName);
  const uhid = lead.uhid ?? patient?.uhid;

  const pharmacyRx = prescriptions.filter((p) => {
    if (uhid && p.uhid === uhid) return true;
    if (patient?.uhid && p.uhid === patient.uhid) return true;
    if (normalizeName(p.patientName) === leadName) return true;
    return false;
  });

  const pharmacyBills = bills.filter((b) => {
    if (uhid && b.uhid === uhid) return true;
    if (normalizeName(b.patientName) === leadName) return true;
    return pharmacyRx.some((r) => r.id === b.prescriptionId);
  });

  const patientId = patient?.id ?? lead.patientId;
  const counselSessions = allSessions.filter(
    (s) => s.patientId === patientId || patientVisits.some((v) => v.id === s.visitId),
  );

  const leadActivities = activities.filter((a) => a.leadId === lead.id);
  const leadFollowUps = followUps.filter((f) => f.leadId === lead.id);

  const timeline = [
    ...crmEvents(leadActivities, leadFollowUps),
    ...visitEvents(patientVisits),
    ...counselEvents(counselSessions),
    ...pharmacyEvents(pharmacyRx, pharmacyBills),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    matchType,
    patient,
    visits: patientVisits,
    pharmacyRx,
    pharmacyBills,
    counselSessions,
    crmActivities: leadActivities,
    followUps: leadFollowUps,
    timeline,
    billing: computeBilling(patientVisits, patient, pharmacyBills),
  };
}
