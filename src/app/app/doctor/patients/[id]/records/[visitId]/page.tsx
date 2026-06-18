"use client";

import { ConsultRecordView } from "@/components/doctor/consult-record-view";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DOCTORS_BY_DEPT } from "@/design-system/mock-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function PatientConsultRecordPage() {
  const params = useParams();
  const patientId = params.id as string;
  const visitId = params.visitId as string;
  const { getPatient, getVisit, getConsultation, startConsultation } = useDoctorStore();

  const patient = getPatient(patientId);
  const visit = getVisit(visitId);

  useEffect(() => {
    if (visit && !getConsultation(visitId)) startConsultation(visitId);
  }, [visit, visitId, getConsultation, startConsultation]);

  const consult = getConsultation(visitId);

  const doctorName =
    visit?.doctorName ??
    DOCTORS_BY_DEPT.dept_spine
      .concat(DOCTORS_BY_DEPT.dept_wellness)
      .find((d) => d.id === consult?.doctorId)?.name ??
    "Doctor";

  if (!patient || !visit || !consult) {
    return (
      <PageChrome breadcrumbs={[{ label: "Doctor", href: "/app/doctor" }, { label: "Record" }]} title="Not found">
        <Link href={`/app/doctor/patients/${patientId}`} className="text-[13px] text-[var(--attio-accent)]">← Patient</Link>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "Patients", href: "/app/doctor/patients" },
        { label: patient.name, href: `/app/doctor/patients/${patientId}` },
        { label: "Clinical record" },
      ]}
      title={`Clinical record · ${patient.name}`}
      meta={`${formatDate(consult)} · ${consultPrimary(consult)}`}
    >
      <Link
        href={`/app/doctor/patients/${patientId}`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text)]"
      >
        <ArrowLeft className="size-4" />
        Patient profile
      </Link>

      <ConsultRecordView
        patient={patient}
        visit={visit}
        consult={consult}
        doctorName={doctorName}
      />
    </PageChrome>
  );
}

function formatDate(c: { completedAt?: string; startedAt: string }) {
  const iso = c.completedAt ?? c.startedAt;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function consultPrimary(c: { diagnosis: Record<string, string | number | boolean> }) {
  return String(c.diagnosis.primaryDiagnosis ?? c.diagnosis.clinicalImpression ?? "Consultation");
}
