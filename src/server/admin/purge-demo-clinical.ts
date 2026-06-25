import { prisma } from "@/lib/prisma";
import { LEGACY_DEMO_DOCTOR_IDS } from "@/lib/legacy-demo-doctors";
import { deletePatientsByIds } from "@/server/clinical/delete-patient";

const DEMO_PATIENT_IDS = /^p\d+$/i;
const DEMO_PATIENT_NAME_PATTERNS = [
  /^User\s*\d+$/i,
  /^User$/i,
  /^Registered User\d*$/i,
  /^Test Patient/i,
];
const DEMO_PATIENT_NAMES = new Set([
  "Suresh Patel",
  "Meena Devi",
  "Vikram Singh",
  "Anita Kumari",
  "Ravi Kumar",
  "Deepak Joshi",
]);

const KEEP_PATIENT_NAMES = new Set(["Parthraj Gohil"]);

const DEMO_DOCTOR_NAMES = [
  "Dr. Rajesh Mehta",
  "Dr. Priya Nair",
  "Dr. Anil Verma",
];

export type PurgeDemoClinicalResult = {
  patientsRemoved: number;
  legacyVisitsRemoved: number;
  demoStaffRemoved: number;
  departmentsUpdated: number;
  patientsRemaining: number;
  keptPatientNames: string[];
  removedPatientNames: string[];
};

function patientDisplayName(patient: { fullName: string; name: string | null }) {
  const full = patient.fullName?.trim();
  if (full) return full;
  return patient.name?.trim() ?? "";
}

export function isDemoPatient(patient: {
  id: string;
  fullName: string;
  name: string | null;
}): boolean {
  const display = patientDisplayName(patient);
  if (KEEP_PATIENT_NAMES.has(display)) return false;
  if (DEMO_PATIENT_IDS.test(patient.id)) return true;
  if (DEMO_PATIENT_NAMES.has(display)) return true;
  return DEMO_PATIENT_NAME_PATTERNS.some((pattern) => pattern.test(display));
}

async function purgePatients(patientIds: string[]) {
  return deletePatientsByIds(patientIds);
}

export async function purgeDemoClinicalData(): Promise<PurgeDemoClinicalResult> {
  const patients = await prisma.patient.findMany({
    select: { id: true, fullName: true, name: true },
  });

  const demoPatients = patients.filter(isDemoPatient);
  const demoPatientIds = demoPatients.map((p) => p.id);
  const keptPatients = patients.filter((p) => !demoPatientIds.includes(p.id));
  const patientsRemoved = await purgePatients(demoPatientIds);

  const legacyVisits = await prisma.opdVisit.deleteMany({
    where: {
      OR: [
        { doctorId: { in: [...LEGACY_DEMO_DOCTOR_IDS] } },
        { doctorName: { in: DEMO_DOCTOR_NAMES } },
      ],
    },
  });

  const departments = await prisma.adminDepartment.findMany();
  let departmentsUpdated = 0;
  for (const dept of departments) {
    const raw = Array.isArray(dept.doctorIds) ? dept.doctorIds.map(String) : [];
    const next = raw.filter((id) => !LEGACY_DEMO_DOCTOR_IDS.has(id));
    if (raw.length !== next.length) {
      await prisma.adminDepartment.update({
        where: { id: dept.id },
        data: { doctorIds: next },
      });
      departmentsUpdated += 1;
    }
  }

  const policies = await prisma.adminRevenuePolicy.findMany();
  for (const policy of policies) {
    if (policy.doctorId && LEGACY_DEMO_DOCTOR_IDS.has(policy.doctorId)) {
      await prisma.adminRevenuePolicy.delete({ where: { id: policy.id } });
    }
  }

  const demoStaffEmails = ["anita@navayu.in", "priya@navayu.in", "finance@navayu.in", "mrd@navayu.in"];
  const removedStaff = await prisma.adminStaff.deleteMany({
    where: {
      OR: [
        { email: { in: demoStaffEmails } },
        { name: { in: DEMO_DOCTOR_NAMES } },
        { id: { in: [...LEGACY_DEMO_DOCTOR_IDS] } },
      ],
    },
  });

  return {
    patientsRemoved,
    legacyVisitsRemoved: legacyVisits.count,
    demoStaffRemoved: removedStaff.count,
    departmentsUpdated,
    patientsRemaining: await prisma.patient.count(),
    keptPatientNames: keptPatients.map((p) => patientDisplayName(p)).filter(Boolean),
    removedPatientNames: demoPatients.map((p) => patientDisplayName(p)).filter(Boolean),
  };
}
