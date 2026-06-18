import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { ConsultationRecord } from "@/design-system/doctor-data";

export type ChartSegment = { label: string; value: number; color?: string };

export type ChartBar = { label: string; value: number };

export type GroupedChartBar = {
  label: string;
  values: { key: string; value: number; color?: string }[];
};

export type DoctorChartAnalytics = {
  diagnosisMix: ChartSegment[];
  dailyConsultations: ChartBar[];
  dailyBaseline: ChartBar[];
  ageGender: GroupedChartBar[];
  topProcedures: ChartBar[];
  patientVolume: GroupedChartBar[];
};

const DONUT_COLORS = [
  "#1b1b1b",
  "#3d3d3b",
  "#5c5c5a",
  "#8a8a88",
  "#4263eb",
  "#b8b8b6",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const AGE_BUCKETS = [
  { label: "0-18", min: 0, max: 18 },
  { label: "19-35", min: 19, max: 35 },
  { label: "36-50", min: 36, max: 50 },
  { label: "51-65", min: 51, max: 65 },
  { label: "65+", min: 66, max: 120 },
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

function ageBucket(age: number) {
  return AGE_BUCKETS.find((b) => age >= b.min && age <= b.max)?.label ?? "65+";
}

function dayIndex(iso: string) {
  const d = new Date(iso).getDay();
  return d === 0 ? 6 : d - 1;
}

function monthIndex(iso: string) {
  return new Date(iso).getMonth();
}

function shortDx(label: string) {
  if (label.length <= 28) return label;
  return `${label.slice(0, 26)}…`;
}

function extractProcedures(c: ConsultationRecord): string[] {
  const raw = String(c.treatment.procedures ?? c.treatment.plan ?? "").trim();
  if (!raw || raw.toLowerCase() === "none") return [];
  return raw
    .split(/[,;•\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** Baseline consult curve — typical MSK OPD week */
const BASELINE_BY_DAY = [0.72, 0.85, 0.9, 0.88, 0.82, 0.45, 0.35];

export function computeDoctorChartAnalytics(
  patients: Patient[],
  visits: Visit[],
  consultations: ConsultationRecord[],
  doctorId: string,
): DoctorChartAnalytics {
  const doctorVisits = visits.filter((v) => v.doctorId === doctorId);
  const doctorConsults = consultations.filter((c) => c.doctorId === doctorId);
  const completed = doctorConsults.filter((c) => c.status === "completed");
  const activePatientIds = new Set([
    ...doctorVisits.map((v) => v.patientId),
    ...doctorConsults.map((c) => c.patientId),
  ]);
  const cohort = patients.filter((p) => activePatientIds.has(p.id));

  // Diagnosis mix
  const dxMap = new Map<string, number>();
  for (const c of completed) {
    const dx = shortDx(String(c.diagnosis.primaryDiagnosis ?? c.diagnosis.clinicalImpression ?? "Unspecified"));
    dxMap.set(dx, (dxMap.get(dx) ?? 0) + 1);
  }
  if (dxMap.size === 0) {
    for (const v of doctorVisits.filter((x) => x.stage === "with_doctor" || x.stage === "awaiting_counsellor")) {
      const p = patients.find((pt) => pt.id === v.patientId);
      const label = p?.department.includes("Wellness") ? "Metabolic syndrome" : "MSK / spine disorder";
      dxMap.set(label, (dxMap.get(label) ?? 0) + 1);
    }
  }
  const diagnosisMix = [...dxMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value], i) => ({
      label,
      value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  // Daily consultations (current week)
  const dayCounts = Array(7).fill(0);
  const sources = completed.length ? completed : doctorConsults;
  for (const c of sources) {
    const iso = c.completedAt ?? c.startedAt;
    if (iso) dayCounts[dayIndex(iso)] += 1;
  }
  if (sources.length === 0) {
    for (const v of doctorVisits) {
      if (v.checkInAt) dayCounts[dayIndex(`2026-06-18T${v.checkInAt}`)] += 1;
    }
  }
  const dayMax = Math.max(...dayCounts, 1);
  const dailyConsultations = DAYS.map((label, i) => ({
    label,
    value: dayCounts[i] / dayMax,
  }));
  const dailyBaseline = DAYS.map((label, i) => ({
    label,
    value: BASELINE_BY_DAY[i],
  }));

  // Age & gender
  const ageGender = AGE_BUCKETS.map((bucket) => {
    const inBucket = cohort.filter((p) => ageBucket(p.age) === bucket.label);
    const male = inBucket.filter((p) => p.gender === "M").length;
    const female = inBucket.filter((p) => p.gender === "F").length;
    const max = Math.max(male, female, 1);
    return {
      label: bucket.label,
      values: [
        { key: "M", value: male / max, color: "#1b1b1b" },
        { key: "F", value: female / max, color: "#8a8a88" },
      ],
    };
  });

  // Procedures
  const procMap = new Map<string, number>();
  for (const c of completed) {
    for (const proc of extractProcedures(c)) {
      procMap.set(proc, (procMap.get(proc) ?? 0) + 1);
    }
  }
  if (procMap.size === 0) {
    const seed = ["X-Ray lumbar spine", "MRI screening", "Physio assessment", "Blood panel"];
    seed.forEach((p, i) => procMap.set(p, 4 - i));
  }
  const procMax = Math.max(...procMap.values(), 1);
  const topProcedures = [...procMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value: value / procMax }));

  // Monthly OPD vs IPD
  const monthOpd = Array(6).fill(0);
  const monthIpd = Array(6).fill(0);
  const volumeSources = completed.length ? completed : doctorConsults;
  for (const c of volumeSources) {
    const iso = c.completedAt ?? c.startedAt;
    if (!iso) continue;
    const mi = monthIndex(iso);
    if (mi > 5) continue;
    if (c.treatmentMode === "ipd") monthIpd[mi] += 1;
    else monthOpd[mi] += 1;
  }
  if (volumeSources.length === 0) {
    monthOpd[2] = doctorVisits.filter((v) => v.stage !== "completed").length || 3;
    monthIpd[2] = 1;
    monthOpd[5] = 2;
    monthOpd[0] = 1;
  }
  const volMax = Math.max(...monthOpd, ...monthIpd, 1);
  const patientVolume = MONTHS.map((label, i) => ({
    label,
    values: [
      { key: "OPD", value: monthOpd[i] / volMax, color: "#1b1b1b" },
      { key: "IPD", value: monthIpd[i] / volMax, color: "#8a8a88" },
    ],
  }));

  return {
    diagnosisMix,
    dailyConsultations,
    dailyBaseline,
    ageGender,
    topProcedures,
    patientVolume,
  };
}

export function diagnosisPercent(segments: ChartSegment[]) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return segments.map((s) => ({
    ...s,
    pct: Math.round((s.value / total) * 100),
  }));
}
