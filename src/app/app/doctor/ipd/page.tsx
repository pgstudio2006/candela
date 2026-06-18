"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { useDoctorFormSchema } from "@/components/doctor/use-doctor-form-schema";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function DoctorIpdPage() {
  const { ipdPatients, getPatient, activeDoctorId, saveIpdRound } = useDoctorStore();
  const schema = useDoctorFormSchema("doctor-ipd-round");
  const [activeIpd, setActiveIpd] = useState<string | null>(null);

  const myPatients = ipdPatients.filter(
    (ip) => ip.attendingDoctorId === activeDoctorId || activeDoctorId === "dr_1",
  );

  const selected = myPatients.find((ip) => ip.id === activeIpd);

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "IPD rounds" },
      ]}
      title="IPD ward rounds"
      meta="SOAP notes · attending consultant"
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Admitted patients">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {myPatients.length === 0 && (
              <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No IPD patients</li>
            )}
            {myPatients.map((ip) => {
              const p = getPatient(ip.patientId);
              const due = !ip.lastRoundAt;
              return (
                <li key={ip.id}>
                  <button
                    type="button"
                    onClick={() => setActiveIpd(ip.id)}
                    className={cn(
                      "w-full py-3 text-left transition-colors",
                      activeIpd === ip.id && "bg-[var(--attio-surface)] -mx-4 px-4",
                    )}
                  >
                    <p className="text-[13px] font-medium">{p?.name ?? ip.patientId}</p>
                    <p className="text-[11px] text-[var(--attio-text-tertiary)]">
                      {ip.ward} · Bed {ip.bed}
                    </p>
                    <div className="mt-1 flex gap-1">
                      <StatusBadge label={ip.status.replace("_", " ")} variant="info" />
                      {due && <StatusBadge label="Round due" variant="warning" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        {selected ? (
          <div className="space-y-4">
            <Panel title={`Round · ${getPatient(selected.patientId)?.name}`}>
              <p className="mb-4 text-[13px] text-[var(--attio-text-secondary)]">
                {selected.diagnosis} · Admitted {selected.admittedAt}
              </p>
              {selected.lastRoundNote && (
                <div className="mb-4 rounded-lg bg-[var(--attio-surface)] p-3 text-[12px] text-[var(--attio-text-secondary)]">
                  <p className="mb-1 font-medium text-[var(--attio-text-tertiary)]">Last round ({selected.lastRoundAt})</p>
                  <pre className="whitespace-pre-wrap font-sans">{selected.lastRoundNote}</pre>
                </div>
              )}
              <SchemaForm
                schema={schema}
                formKey={`ipd-${selected.id}`}
                submitLabel="Save round note"
                onSubmit={(data) => {
                  saveIpdRound(selected.id, data);
                  setActiveIpd(null);
                }}
              />
            </Panel>
          </div>
        ) : (
          <Panel title="Select a patient">
            <p className="py-12 text-center text-[13px] text-[var(--attio-text-tertiary)]">
              Choose an admitted patient to record a ward round
            </p>
          </Panel>
        )}
      </div>
    </PageChrome>
  );
}
