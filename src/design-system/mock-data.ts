/** Mock data for UI phase — replaced by API later */

export const BRANCHES = [
  { id: "branch_gurgaon", name: "Gurgaon Center", code: "GGN" },
  { id: "branch_pataudi", name: "Pataudi Center", code: "PTD" },
];

export const DEPARTMENTS = [
  { id: "dept_spine", label: "Spine & Joint Care" },
  { id: "dept_wellness", label: "Wellness & Metabolic" },
];

export const DOCTORS_BY_DEPT: Record<string, { id: string; name: string }[]> = {
  dept_spine: [],
  dept_wellness: [],
};

export const QUEUE_PATIENTS: {
  id: string;
  token: number;
  name: string;
  uhid: string;
  doctor: string;
  billing: "paid" | "deferred" | "pending" | "partial";
  exam: "done" | "pending" | "in_progress";
  appointment: boolean;
  waitMin: number;
}[] = [];

export const MASTER_KPIS = [
  { label: "MSK Pipeline", value: "24 active", delta: "+3 today" },
  { label: "Expense Pulse", value: "₹4.2L MTD", delta: "On budget" },
  { label: "Approval Queue", value: "7 pending", delta: "2 urgent" },
  { label: "Staff On Duty", value: "18 / 22", delta: "Gurgaon" },
];

export const COUNSELLOR_HANDOFF = {
  patient: "Suresh Patel",
  uhid: "NV-2026-0042",
  diagnosis: "Lumbar disc disease with radiculopathy",
  treatment: "Conservative MSK protocol — 12 sessions",
  packages: ["Advanced Regenerative", "Basic Care"],
  prescription: "Tab. Pregabalin 75mg · Physio protocol A",
  advice: "Counsel on lifestyle modification and follow-up at 2 weeks",
};
