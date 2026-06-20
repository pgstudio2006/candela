"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { queueWaitMinutes } from "@/design-system/counsellor-data";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";
import { isRedFlagVisit, patientDisplayName } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";
import { Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CounsellorQueuePage() {
  useCounsellorPoll();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "high">("all");
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>();
  const { getFilteredQueue, getPatient, getVisit, queue } = useCounsellorStore();
  const doctors = [...new Map(queue.map((q) => [q.doctorId, q.doctorName])).entries()];
  const filtered = getFilteredQueue({
    priority: filter === "high" ? "high" : undefined,
    doctorId: doctorFilter,
  });

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Queue" }]}
      title="Counsel queue"
      meta="Red flags & priority first · live sync"
      actions={
        <div className="flex flex-wrap gap-2">
          {(["all", "high"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-[12px] capitalize", filter === f ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>{f === "all" ? "All" : "High priority"}</button>
          ))}
          <AttioButton variant="secondary" className="gap-1.5" onClick={() => setDoctorFilter(undefined)}>
            <Users className="size-3.5" />
            All doctors
          </AttioButton>
        </div>
      }
    >
      {doctors.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {doctors.map(([id, name]) => (
            <button key={id} type="button" onClick={() => setDoctorFilter(id === doctorFilter ? undefined : id)} className={cn("rounded-full border px-2.5 py-1 text-[11px]", doctorFilter === id ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>
              {name}
            </button>
          ))}
        </div>
      )}

      <Panel title={`${filtered.length} waiting`}>
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {filtered.length === 0 && <li className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">No patients in counsel queue</li>}
          {filtered.map((q) => {
            const p = getPatient(q.patientId);
            if (!p) return null;
            const v = getVisit(q.visitId);
            const redFlag = v ? isRedFlagVisit(v) : false;
            const dx = String(q.payload.diagnosis.primaryDiagnosis ?? q.payload.diagnosis.clinicalImpression ?? "Consult handoff");
            return (
              <li key={q.id} className={cn("flex items-center justify-between gap-4 py-4", (q.priority === "high" || redFlag) && "bg-amber-50/40 -mx-4 px-4", redFlag && "bg-red-50/40")}>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{patientDisplayName(p)}</p>
                  <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{p.uhid}</p>
                  <p className="mt-1 truncate text-[12px] text-[var(--attio-text-secondary)]">{dx}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusBadge label={q.doctorName} variant="neutral" />
                    <StatusBadge label={q.treatmentMode.toUpperCase()} variant="info" />
                    {redFlag && <StatusBadge label="RED FLAG" variant="danger" />}
                    {q.priority === "high" && <StatusBadge label="Warm lead" variant="warning" />}
                    {v && <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : "warning"} />}
                  </div>
                  {v?.routingNote && <p className="mt-1 text-[11px] text-amber-800">{v.routingNote}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1 text-[12px] text-[var(--attio-text-tertiary)]"><Clock className="size-3.5" />{queueWaitMinutes(q.sentAt)}m</span>
                  <AttioButton variant="primary" onClick={() => router.push(`/app/counsellor/session/${q.visitId}`)}>Open session</AttioButton>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </PageChrome>
  );
}
