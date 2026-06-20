/** Department + doctor roster resolved from admin DB (with legacy seed fallbacks) */

export type DoctorOption = { id: string; name: string };
export type DeptOption = { id: string; label: string };

export type ClinicalRoster = {
  departments: DeptOption[];
  doctorsByDept: Record<string, DoctorOption[]>;
  doctorNames: Record<string, string>;
  allDoctors: DoctorOption[];
};

const LEGACY_DOCTOR_NAMES: Record<string, string> = {
  dr_1: "Dr. Rajesh Mehta",
  dr_2: "Dr. Priya Nair",
  dr_3: "Dr. Anil Verma",
};

/** Demo / legacy login email → OPD doctor queue id */
export const DOCTOR_LOGIN_EMAIL_MAP: Record<string, string> = {
  "doctor@navayu.in": "dr_1",
  "dr.mehta@navayu.in": "dr_1",
};

/** Legacy doctor id → HR employee email for leave checks */
export const DOCTOR_HR_EMAIL_MAP: Record<string, string> = {
  dr_1: "dr.mehta@navayu.in",
  dr_2: "priya@navayu.in",
  dr_3: "anita@navayu.in",
};

export function doctorIdFromStaffId(staffId: string) {
  return `dr_${staffId.replace(/^st_/, "")}`;
}

export function staffIdFromDoctorId(doctorId: string) {
  return doctorId.startsWith("dr_") ? `st_${doctorId.slice(3)}` : null;
}

export function resolveDoctorName(doctorId: string, roster?: ClinicalRoster | null) {
  if (roster?.doctorNames[doctorId]) return roster.doctorNames[doctorId];
  return LEGACY_DOCTOR_NAMES[doctorId] ?? doctorId.replace(/^dr_/, "Dr. ");
}

export function deptLabelFromRoster(deptId: string, roster?: ClinicalRoster | null): string {
  const fromRoster = roster?.departments.find((d) => d.id === deptId)?.label;
  if (fromRoster) return fromRoster;
  return deptId.replace(/^dept_/, "").replace(/_/g, " ");
}

export function buildClinicalRoster(
  departments: { id: string; label: string; doctorIds: string[]; active?: boolean }[],
  staff: { id: string; name: string; role: string }[],
): ClinicalRoster {
  const doctorNames: Record<string, string> = { ...LEGACY_DOCTOR_NAMES };

  for (const member of staff) {
    if (member.role === "doctor") {
      doctorNames[doctorIdFromStaffId(member.id)] = member.name;
    }
  }

  const activeDepts = departments.filter((d) => d.active !== false);
  const doctorsByDept: Record<string, DoctorOption[]> = {};

  for (const dept of activeDepts) {
    doctorsByDept[dept.id] = dept.doctorIds.map((id) => ({
      id,
      name: doctorNames[id] ?? id,
    }));
  }

  const allFromDepts = Object.values(doctorsByDept).flat();
  const allDoctors = [...allFromDepts, ...staff.filter((s) => s.role === "doctor").map((s) => ({
    id: doctorIdFromStaffId(s.id),
    name: s.name,
  }))].filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);

  return {
    departments: activeDepts.map((d) => ({ id: d.id, label: d.label })),
    doctorsByDept,
    doctorNames,
    allDoctors,
  };
}

export function doctorsForDepartment(roster: ClinicalRoster, deptId: string): DoctorOption[] {
  return roster.doctorsByDept[deptId] ?? roster.allDoctors;
}

export const EMPTY_ROSTER: ClinicalRoster = buildClinicalRoster(
  [
    { id: "dept_spine", label: "Spine & Joint Care", doctorIds: ["dr_1", "dr_2"], active: true },
    { id: "dept_wellness", label: "Wellness & Metabolic", doctorIds: ["dr_3"], active: true },
  ],
  [],
);
