"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, Panel } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { formatStageStatus } from "@/lib/frontdesk-workflow";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { searchPatients, visits, getPatient } = useDoctorStore();
  const patients = searchPatients(q);

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "Patients" },
      ]}
      title="My patients"
      meta="Patients you have consulted or who are in your OPD queue"
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--attio-text-tertiary)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search patients…"
          className="pl-9"
        />
      </div>

      <Panel title={`${patients.length} patients`}>
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "uhid", label: "UHID" },
            { key: "dept", label: "Department" },
            { key: "stage", label: "Today's stage" },
          ]}
          rows={patients.map((p) => {
            const v = visits.find((x) => x.patientId === p.id);
            return {
              name: p.name,
              uhid: p.uhid,
              dept: p.department,
              stage: v ? formatStageStatus(v.stage) : "—",
            };
          })}
          onRowClick={(i) => router.push(`/app/doctor/patients/${patients[i].id}`)}
        />
      </Panel>
    </PageChrome>
  );
}
