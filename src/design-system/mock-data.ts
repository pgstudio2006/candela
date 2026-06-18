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
  dept_spine: [
    { id: "dr_1", name: "Dr. Rajesh Mehta" },
    { id: "dr_2", name: "Dr. Priya Nair" },
  ],
  dept_wellness: [{ id: "dr_3", name: "Dr. Anil Verma" }],
};

export const QUEUE_PATIENTS = [
  {
    id: "q1",
    token: 12,
    name: "Suresh Patel",
    uhid: "NV-2026-0042",
    doctor: "Dr. Rajesh Mehta",
    billing: "paid" as const,
    exam: "done" as const,
    appointment: false,
    waitMin: 8,
  },
  {
    id: "q2",
    token: 13,
    name: "Meena Devi",
    uhid: "NV-2026-0043",
    doctor: "Dr. Rajesh Mehta",
    billing: "deferred" as const,
    exam: "pending" as const,
    appointment: true,
    waitMin: 3,
  },
  {
    id: "q3",
    token: 14,
    name: "Vikram Singh",
    uhid: "NV-2026-0044",
    doctor: "Dr. Priya Nair",
    billing: "paid" as const,
    exam: "pending" as const,
    appointment: false,
    waitMin: 15,
  },
];

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
