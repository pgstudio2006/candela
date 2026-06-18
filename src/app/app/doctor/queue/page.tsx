"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { Clock, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DoctorQueuePage() {
  const router = useRouter();
  const { getOpdQueue, getPatient, startConsultation } = useDoctorStore();
  const queue = getOpdQueue();

  const callNext = () => {
    const next = queue[0];
    if (next) {
      startConsultation(next.id);
      router.push(`/app/doctor/consult/${next.id}`);
    }
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "OPD queue" },
      ]}
      title="OPD queue"
      meta="Patients with completed junior exam · FIFO"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={callNext} disabled={!queue.length}>
          <Stethoscope className="size-3.5" />
          Start next consult
        </AttioButton>
      }
    >
      <Panel title="Waiting for consultant" action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">{queue.length} in queue</span>}>
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {queue.length === 0 && (
            <li className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">
              Queue clear — patients appear after junior exam handoff
            </li>
          )}
          {queue.map((v) => {
            const p = getPatient(v.patientId)!;
            return (
              <li
                key={v.id}
                className={cn("flex items-center justify-between gap-4 py-4", v.appointment && "bg-blue-50/40 -mx-4 px-4")}
              >
                <div>
                  <p className="text-[14px] font-medium">
                    #{v.token} · {p.name}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{p.uhid}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : "warning"} />
                    <StatusBadge label={`Exam ${v.exam}`} variant="success" />
                    {v.appointment && <StatusBadge label={`Appt ${v.appointmentTime}`} variant="info" />}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[12px] text-[var(--attio-text-tertiary)]">
                    <Clock className="size-3.5" />
                    {v.waitMin}m
                  </span>
                  <AttioButton
                    variant="secondary"
                    onClick={() => {
                      startConsultation(v.id);
                      router.push(`/app/doctor/consult/${v.id}`);
                    }}
                  >
                    Consult
                  </AttioButton>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </PageChrome>
  );
}
