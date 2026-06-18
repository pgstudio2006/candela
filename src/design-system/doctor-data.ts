/** Doctor module — seed data & types */

export type TreatmentMode = "opd" | "ipd" | "daycare";

export type PrescriptionLine = {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

export type ConsultationRecord = {
  visitId: string;
  patientId: string;
  doctorId: string;
  startedAt: string;
  completedAt?: string;
  status: "draft" | "in_progress" | "completed";
  treatmentMode: TreatmentMode;
  recommendCounsellor: boolean;
  skipCounsellor: boolean;
  packageId?: string;
  counsellorNotes?: string;
  doctorAdvice?: string;
  whatsappRxSent: boolean;
  examination: Record<string, string | number | boolean>;
  diagnosis: Record<string, string | number | boolean>;
  treatment: Record<string, string | number | boolean>;
  prescription: PrescriptionLine[];
  notes: string;
  scribeTranscript?: string;
  scribeLanguage?: string;
  scribeAppliedAt?: string;
  templateId?: string;
  handoff?: Record<string, string | number | boolean>;
};

export type CounsellorQueueItem = {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  sentAt: string;
  treatmentMode: TreatmentMode;
  packageId?: string;
  packageLabel?: string;
  priority: "normal" | "high";
  payload: ConsultationRecord;
};

export type IpdPatient = {
  id: string;
  patientId: string;
  ward: string;
  bed: string;
  admittedAt: string;
  diagnosis: string;
  attendingDoctorId: string;
  lastRoundAt?: string;
  lastRoundNote?: string;
  status: "admitted" | "discharge_planned" | "discharged";
};

export type DoctorTemplate = {
  id: string;
  label: string;
  doctorId: string;
  disease: string;
  diagnosis: Record<string, string | number | boolean>;
  treatment: Record<string, string | number | boolean>;
  prescription: PrescriptionLine[];
};

export type CarePackage = {
  id: string;
  label: string;
  amount: number;
  sessions: number;
  dept: string;
};

export const CARE_PACKAGES: CarePackage[] = [
  { id: "pkg_regen", label: "Advanced Regenerative — 12 sessions", amount: 85000, sessions: 12, dept: "dept_spine" },
  { id: "pkg_basic", label: "Basic MSK Care — 6 sessions", amount: 32000, sessions: 6, dept: "dept_spine" },
  { id: "pkg_wellness", label: "Metabolic Reset — 8 sessions", amount: 45000, sessions: 8, dept: "dept_wellness" },
  { id: "pkg_opd", label: "OPD follow-up only", amount: 1500, sessions: 1, dept: "dept_spine" },
];

export const DOCTOR_TEMPLATES: DoctorTemplate[] = [
  {
    id: "tpl_lumbar",
    label: "Lumbar radiculopathy — conservative",
    doctorId: "dr_1",
    disease: "Lumbar disc disease",
    diagnosis: {
      primaryDiagnosis: "Lumbar disc disease with radiculopathy",
      icdTag: "M51.1",
      severity: "moderate",
    },
    treatment: {
      plan: "Conservative MSK protocol — physiotherapy, activity modification",
      followUp: "2 weeks",
      procedures: "None",
    },
    prescription: [
      { id: "rx1", drug: "Tab. Pregabalin 75mg", dose: "1 tab", frequency: "OD", duration: "14 days" },
      { id: "rx2", drug: "Tab. Etoricoxib 60mg", dose: "1 tab", frequency: "OD", duration: "5 days" },
    ],
  },
  {
    id: "tpl_cervical",
    label: "Cervical spondylosis — MSK",
    doctorId: "dr_1",
    disease: "Cervical spondylosis",
    diagnosis: {
      primaryDiagnosis: "Cervical spondylosis with myofascial pain",
      icdTag: "M47.8",
      severity: "mild",
    },
    treatment: {
      plan: "Cervical stabilization exercises, ergonomic counselling",
      followUp: "3 weeks",
      procedures: "None",
    },
    prescription: [
      { id: "rx1", drug: "Tab. Thiocolchicoside 4mg", dose: "1 tab", frequency: "BD", duration: "7 days" },
    ],
  },
  {
    id: "tpl_wellness",
    label: "Metabolic syndrome — wellness",
    doctorId: "dr_3",
    disease: "Metabolic syndrome",
    diagnosis: {
      primaryDiagnosis: "Metabolic syndrome — lifestyle disorder",
      icdTag: "E88.81",
      severity: "moderate",
    },
    treatment: {
      plan: "Diet protocol A, structured exercise, metabolic monitoring",
      followUp: "4 weeks",
      procedures: "Body composition analysis",
    },
    prescription: [],
  },
];

export const IPD_PATIENTS: IpdPatient[] = [
  {
    id: "ipd1",
    patientId: "p1",
    ward: "MSK Ward A",
    bed: "A-12",
    admittedAt: "2026-06-15",
    diagnosis: "Lumbar disc — IPD rehab",
    attendingDoctorId: "dr_1",
    lastRoundAt: "2026-06-17 08:30",
    lastRoundNote: "Pain 4/10. Physio tolerated. Continue protocol.",
    status: "admitted",
  },
  {
    id: "ipd2",
    patientId: "p3",
    ward: "Wellness Unit",
    bed: "W-03",
    admittedAt: "2026-06-16",
    diagnosis: "Metabolic reset program",
    attendingDoctorId: "dr_3",
    status: "admitted",
  },
];

export const DOCTOR_SCHEDULE_BLOCKS = [
  { doctorId: "dr_1", date: "2026-06-18", slots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"] },
  { doctorId: "dr_2", date: "2026-06-18", slots: ["10:00", "10:30", "11:00", "11:30"] },
  { doctorId: "dr_3", date: "2026-06-18", slots: ["09:00", "09:30", "10:00", "11:00", "11:30", "12:00", "12:30"] },
];

export const SCRIBE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
  { id: "pa", label: "Punjabi" },
  { id: "mr", label: "Marathi" },
];

export const DEMO_DOCTOR_ID = "dr_1";
