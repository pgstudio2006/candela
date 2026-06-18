"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { queueWaitMinutes } from "@/design-system/counsellor-data";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CounsellorQueuePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "high">("all");
  const { getFilteredQueue, getPatient, getVisit } = useCounsellorStore();
  const queue = getFilteredQueue(filter === "high" ? { priority: "high" } : undefined);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Queue" }]}
      title="Counsel queue"
      meta="FIFO · priority highlight · full handoff on open"
      actions={
        <div className="flex gap-2">
          {(["all", "high"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-[12px] capitalize", filter === f ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>{f === "all" ? "All" : "High priority"}</button>
          ))}
        </div>
      }
    >
      <Panel title={`${queue.length} waiting`}>
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {queue.length === 0 && <li className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">No patients in counsel queue</li>}
          {queue.map((q) => {
            const p = getPatient(q.patientId)!;
            const v = getVisit(q.visitId);
            const dx = String(q.payload.diagnosis.primaryDiagnosis ?? q.payload.diagnosis.clinicalImpression ?? "Consult handoff");
            return (
              <li key={q.id} className={cn("flex items-center justify-between gap-4 py-4", q.priority === "high" && "bg-amber-50/40 -mx-4 px-4")}>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{p.name}</p>
                  <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{p.uhid}</p>
                  <p className="mt-1 truncate text-[12px] text-[var(--attio-text-secondary)]">{dx}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusBadge label={q.doctorName} variant="neutral" />
                    <StatusBadge label={q.treatmentMode.toUpperCase()} variant="info" />
                    {q.priority === "high" && <StatusBadge label="Warm lead" variant="warning" />}
                    {v && <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : "warning"} />}
                  </div>
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
