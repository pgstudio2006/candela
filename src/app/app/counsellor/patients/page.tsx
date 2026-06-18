"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, Panel } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CounsellorPatientsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { searchPatients, visits, getPatientCommercialHistory } = useCounsellorStore();
  const patients = searchPatients(q);

  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Patients" }]} title="Patients" meta="Commercial + clinical visibility">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--attio-text-tertiary)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
      </div>
      <Panel title={`${patients.length} patients`}>
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "uhid", label: "UHID" },
            { key: "sessions", label: "Counsel sessions" },
            { key: "stage", label: "Visit stage" },
          ]}
          rows={patients.map((p) => {
            const v = visits.find((x) => x.patientId === p.id);
            return {
              name: p.name,
              uhid: p.uhid,
              sessions: String(getPatientCommercialHistory(p.id).length),
              stage: v?.stage.replace(/_/g, " ") ?? "—",
            };
          })}
          onRowClick={(i) => router.push(`/app/counsellor/patients/${patients[i].id}`)}
        />
      </Panel>
    </PageChrome>
  );
}
