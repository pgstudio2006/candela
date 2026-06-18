"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, Panel } from "@/components/frontdesk/ui";
import Link from "next/link";
import { useState } from "react";

export default function NursePatientsPage() {
  const { searchPatients, handoffs, getEpisode } = useNurseStore();
  const [q, setQ] = useState("");
  const patients = searchPatients(q);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Patients" }]}
      title="Patients in care"
      meta="Active episodes & nursing history"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, UHID, phone…"
        className="mb-4 h-9 w-full max-w-md rounded-lg border border-[var(--attio-border)] px-3 text-[13px]"
      />
      <Panel title="Patients">
        <DataTable
          columns={[
            { key: "name", label: "Patient" },
            { key: "uhid", label: "UHID" },
            { key: "care", label: "Care status" },
          ]}
          rows={patients.map((p) => {
            const handoff = handoffs.find((h) => h.patientId === p.id);
            const ep = handoff ? getEpisode(handoff.visitId) : undefined;
            return {
              name: (
                <Link href={`/app/nurse/patients/${p.id}`} className="font-medium text-[var(--attio-accent)] hover:underline">
                  {p.name}
                </Link>
              ),
              uhid: p.uhid,
              care: ep?.status ?? (handoff ? "queued" : "—"),
            };
          })}
        />
      </Panel>
    </PageChrome>
  );
}
