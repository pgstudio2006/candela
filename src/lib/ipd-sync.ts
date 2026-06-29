import type { IpdPatient } from "@/design-system/doctor-data";
import { IPD_PATIENTS } from "@/design-system/doctor-data";
import { IPD_WARD_OPTIONS } from "@/design-system/ipd-data";

export { IPD_WARD_OPTIONS } from "@/design-system/ipd-data";

const DOCTOR_STORAGE_KEY = "candela-doctor-v1";

type AdmitInput = {
  patientId: string;
  visitId: string;
  doctorId: string;
  diagnosis: string;
  ward: string;
  bed: string;
};

function loadIpdList(): IpdPatient[] {
  if (typeof window === "undefined") return structuredClone(IPD_PATIENTS);
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { ipdPatients?: IpdPatient[] };
      return parsed.ipdPatients ?? structuredClone(IPD_PATIENTS);
    }
  } catch {
    /* seed */
  }
  return structuredClone(IPD_PATIENTS);
}

export function admitPatientToIpd(input: AdmitInput): string {
  const list = loadIpdList();
  const id = `ipd_${input.visitId}`;
  const admission: IpdPatient = {
    id,
    patientId: input.patientId,
    ward: input.ward,
    bed: input.bed,
    admittedAt: new Date().toISOString().slice(0, 10),
    diagnosis: input.diagnosis,
    attendingDoctorId: input.doctorId,
    status: "admitted",
  };

  const next = [...list.filter((p) => p.patientId !== input.patientId || p.status === "discharged"), admission];
  const raw = localStorage.getItem(DOCTOR_STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : {};
  parsed.ipdPatients = next;
  localStorage.setItem(DOCTOR_STORAGE_KEY, JSON.stringify(parsed));
  window.dispatchEvent(new CustomEvent("candela-ipd-updated"));
  return id;
}
