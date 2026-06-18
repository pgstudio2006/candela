/** Front Desk mock data — UI phase */

export type BillingStatus = "paid" | "deferred" | "pending" | "partial";
export type ExamStatus = "not_started" | "in_progress" | "done";
export type VisitStage =
  | "registered"
  | "checked_in"
  | "billing"
  | "queued"
  | "junior_exam"
  | "with_doctor"
  | "awaiting_counsellor"
  | "ipd_admitted"
  | "nursing_queue"
  | "nursing_active"
  | "completed";

export type TreatmentPath = "opd" | "ipd" | "daycare";

export type Patient = {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  email?: string;
  age: number;
  gender: "M" | "F" | "O";
  department: string;
  departmentId: string;
  tags: string[];
  balance: number;
  lastVisit?: string;
  referrer?: string;
};

export type Visit = {
  id: string;
  patientId: string;
  token?: number;
  stage: VisitStage;
  departmentId: string;
  doctorId: string;
  doctorName: string;
  billing: BillingStatus;
  exam: ExamStatus;
  appointment: boolean;
  appointmentTime?: string;
  waitMin: number;
  checkInAt?: string;
  billAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  treatmentPath?: TreatmentPath;
  ipdAdmissionId?: string;
  counselPackageLabel?: string;
  deferredReason?: string;
  routingNote?: string;
};

export const APPOINTMENT_SLOTS = {
  dept_spine: { durationMin: 20, bufferMin: 5 },
  dept_wellness: { durationMin: 30, bufferMin: 10 },
};

export const PATIENTS: Patient[] = [
  {
    id: "p1",
    uhid: "NV-2026-0042",
    name: "Suresh Patel",
    phone: "+91 98765 43210",
    email: "suresh.p@email.com",
    age: 52,
    gender: "M",
    department: "Spine & Joint Care",
    departmentId: "dept_spine",
    tags: ["OPD", "Follow-up"],
    balance: 0,
    lastVisit: "2026-06-10",
    referrer: "Dr. Sharma",
  },
  {
    id: "p2",
    uhid: "NV-2026-0043",
    name: "Meena Devi",
    phone: "+91 98123 45678",
    age: 38,
    gender: "F",
    department: "Spine & Joint Care",
    departmentId: "dept_spine",
    tags: ["Appointment", "New"],
    balance: 1200,
    referrer: "Google",
  },
  {
    id: "p3",
    uhid: "NV-2026-0044",
    name: "Vikram Singh",
    phone: "+91 99887 76655",
    age: 45,
    gender: "M",
    department: "Wellness & Metabolic",
    departmentId: "dept_wellness",
    tags: ["Walk-in"],
    balance: 0,
    lastVisit: "2026-06-01",
  },
  {
    id: "p4",
    uhid: "NV-2026-0045",
    name: "Anita Kumari",
    phone: "+91 91234 56789",
    age: 29,
    gender: "F",
    department: "Spine & Joint Care",
    departmentId: "dept_spine",
    tags: ["Corporate"],
    balance: 450,
    referrer: "TCS Wellness",
  },
];

export const VISITS: Visit[] = [
  {
    id: "v1",
    patientId: "p1",
    token: 12,
    stage: "queued",
    departmentId: "dept_spine",
    doctorId: "dr_1",
    doctorName: "Dr. Rajesh Mehta",
    billing: "paid",
    exam: "done",
    appointment: false,
    waitMin: 8,
    checkInAt: "09:42",
    billAmount: 1500,
  },
  {
    id: "v2",
    patientId: "p2",
    token: 13,
    stage: "junior_exam",
    departmentId: "dept_spine",
    doctorId: "dr_1",
    doctorName: "Dr. Rajesh Mehta",
    billing: "deferred",
    exam: "in_progress",
    appointment: true,
    appointmentTime: "10:30",
    waitMin: 3,
    checkInAt: "10:15",
    billAmount: 1500,
    deferredReason: "Corporate billing — TCS",
  },
  {
    id: "v3",
    patientId: "p3",
    token: 14,
    stage: "billing",
    departmentId: "dept_wellness",
    doctorId: "dr_3",
    doctorName: "Dr. Anil Verma",
    billing: "pending",
    exam: "not_started",
    appointment: false,
    waitMin: 0,
    checkInAt: "10:48",
  },
  {
    id: "v4",
    patientId: "p4",
    token: 15,
    stage: "checked_in",
    departmentId: "dept_spine",
    doctorId: "dr_2",
    doctorName: "Dr. Priya Nair",
    billing: "pending",
    exam: "not_started",
    appointment: true,
    appointmentTime: "11:00",
    waitMin: 0,
    checkInAt: "10:55",
  },
  {
    id: "v5",
    patientId: "p2",
    token: 16,
    stage: "with_doctor",
    departmentId: "dept_spine",
    doctorId: "dr_1",
    doctorName: "Dr. Rajesh Mehta",
    billing: "deferred",
    exam: "done",
    appointment: true,
    appointmentTime: "10:30",
    waitMin: 5,
    checkInAt: "10:15",
    billAmount: 1500,
    deferredReason: "Corporate billing — TCS",
  },
  {
    id: "v6",
    patientId: "p1",
    token: 17,
    stage: "awaiting_counsellor",
    departmentId: "dept_spine",
    doctorId: "dr_1",
    doctorName: "Dr. Rajesh Mehta",
    billing: "pending",
    exam: "done",
    appointment: false,
    waitMin: 0,
    checkInAt: "11:05",
    billAmount: 0,
  },
  {
    id: "v7",
    patientId: "p1",
    token: 18,
    stage: "nursing_queue",
    departmentId: "dept_spine",
    doctorId: "dr_1",
    doctorName: "Dr. Rajesh Mehta",
    billing: "paid",
    exam: "done",
    appointment: false,
    waitMin: 0,
    checkInAt: "11:30",
    billAmount: 32000,
    amountPaid: 32000,
    treatmentPath: "opd",
    counselPackageLabel: "Basic MSK Care — 6 sessions",
    routingNote: "Demo seed — ready for nursing intake & consent",
  },
];

export const DASHBOARD_KPIS = [
  { label: "Arrivals today", value: "47", delta: "+12 vs yesterday", trend: "up" as const },
  { label: "Checked in", value: "32", delta: "68% of arrivals", trend: "neutral" as const },
  { label: "Billed (paid)", value: "24", delta: "₹1.8L collected", trend: "up" as const },
  { label: "In queue", value: "11", delta: "3 waiting >20 min", trend: "down" as const },
  { label: "Junior exam", value: "4", delta: "2 in progress", trend: "neutral" as const },
  { label: "With doctor", value: "6", delta: "Avg 14 min consult", trend: "neutral" as const },
];

export const ACTION_ITEMS = [
  { id: "a1", priority: "urgent", text: "Meena Devi — billing deferred, junior exam in progress", action: "Open junior exam", href: "/app/frontdesk/junior-exam" },
  { id: "a2", priority: "high", text: "Vikram Singh — checked in, billing pending", action: "Create bill", href: "/app/frontdesk/billing" },
  { id: "a3", priority: "high", text: "Anita Kumari — appointment 11:00, not billed", action: "Check-in & bill", href: "/app/frontdesk/check-in" },
  { id: "a4", priority: "normal", text: "Dr. Mehta queue — 3 patients, longest wait 18 min", action: "View queue", href: "/app/frontdesk/queue" },
];

export const TODAY_TIMELINE = [
  { time: "09:00", type: "appointment", patient: "Ravi Kumar", doctor: "Dr. Mehta", status: "completed" },
  { time: "09:30", type: "walk-in", patient: "Suresh Patel", doctor: "Dr. Mehta", status: "in_queue" },
  { time: "10:30", type: "appointment", patient: "Meena Devi", doctor: "Dr. Mehta", status: "junior_exam" },
  { time: "11:00", type: "appointment", patient: "Anita Kumari", doctor: "Dr. Nair", status: "checked_in" },
  { time: "11:30", type: "appointment", patient: "Deepak Joshi", doctor: "Dr. Verma", status: "upcoming" },
];

export const DOCTOR_LOAD = [
  { id: "dr_1", name: "Dr. Rajesh Mehta", dept: "Spine", queue: 3, avgWait: 14, nextAvailable: "12:10" },
  { id: "dr_2", name: "Dr. Priya Nair", dept: "Spine", queue: 2, avgWait: 8, nextAvailable: "11:45" },
  { id: "dr_3", name: "Dr. Anil Verma", dept: "Wellness", queue: 1, avgWait: 5, nextAvailable: "11:20" },
];

export const BILLING_TEMPLATES = [
  { id: "bt1", label: "Spine OPD Consult", amount: 1500, dept: "dept_spine" },
  { id: "bt2", label: "Wellness OPD Consult", amount: 2000, dept: "dept_wellness" },
  { id: "bt3", label: "X-Ray Package", amount: 2500, dept: "dept_spine" },
  { id: "bt4", label: "Physio Session (single)", amount: 800, dept: "dept_spine" },
];

export const CHECKIN_WAITING = [
  { patientId: "p4", appointmentTime: "11:00", doctor: "Dr. Priya Nair", type: "appointment" as const },
  { patientId: "p3", appointmentTime: undefined, doctor: "Dr. Anil Verma", type: "walk-in" as const },
];

export function getPatient(id: string) {
  return PATIENTS.find((p) => p.id === id);
}

export function getVisit(id: string) {
  return VISITS.find((v) => v.id === id);
}

export function getPatientVisits(patientId: string) {
  return VISITS.filter((v) => v.patientId === patientId);
}

export function visitsByDoctor(doctorId: string) {
  return VISITS.filter((v) => v.doctorId === doctorId && ["queued", "junior_exam"].includes(v.stage));
}
