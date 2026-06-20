"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { consentProgress, queueWaitMinutes } from "@/design-system/nurse-data";
import { useNursePoll } from "@/hooks/use-nurse-poll";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function QueueContent() {
  useNursePoll();
  const router = useRouter();
  const params = useSearchParams();
  const visitParam = params.get("visit");
  const { getFilteredQueue, getPatient, getEpisode, getVisit } = useNurseStore();
  const queue = getFilteredQueue();

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Execution queue" }]}
      title="Treatment execution queue"
      meta="Post-billing handoffs · consent gate before session 1 · live refresh"
    >
      <div className="grid gap-3">
        {queue.length === 0 && (
          <Panel title="Queue empty">
            <p className="text-[13px] text-[var(--attio-text-tertiary)]">
              Complete counsellor → billing flow to populate nursing handoffs.
            </p>
          </Panel>
        )}
        {queue.map((h) => {
          const p = getPatient(h.patientId);
          const ep = getEpisode(h.visitId);
          const v = getVisit(h.visitId);
          const progress = ep ? consentProgress(ep.consents) : { done: 0, total: 0 };
          const selected = visitParam === h.visitId;
          const highPriority =
            ep?.priority === "high" || h.treatmentPath === "ipd" || Boolean(ep?.vitals?.redFlags?.trim());

          return (
            <div
              key={h.visitId}
              className={cn(
                "rounded-xl border bg-white p-4 transition-colors",
                selected ? "border-[var(--attio-accent)] shadow-sm" : "border-[var(--attio-border)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold">{p?.name ?? h.patientName}</p>
                  <p className="text-[12px] text-[var(--attio-text-tertiary)]">
                    {h.uhid} · {h.doctorName} · {queueWaitMinutes(h.sentAt)}m wait
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-[var(--attio-accent)]">{h.packageLabel}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusBadge label={h.treatmentPath.toUpperCase()} variant="info" />
                    <StatusBadge label={h.billingStatus} variant={h.billingStatus === "paid" ? "success" : "warning"} />
                    {h.balanceDue ? <StatusBadge label={`₹${h.balanceDue} due`} variant="warning" /> : null}
                    {highPriority && <StatusBadge label="Priority" variant="warning" />}
                    {ep && <StatusBadge label={`Consent ${progress.done}/${progress.total}`} variant="neutral" />}
                    {ep && ep.status !== "queued" && <StatusBadge label={ep.status.replace("_", " ")} variant="neutral" />}
                    {ep && <StatusBadge label={`Nurse: ${ep.nurseName}`} variant="neutral" />}
                  </div>
                  {v?.routingNote && (
                    <p className="mt-2 text-[11px] text-[var(--attio-text-secondary)]">{v.routingNote}</p>
                  )}
                </div>
                <AttioButton variant="primary" onClick={() => router.push(`/app/nurse/episode/${h.visitId}`)}>
                  Open episode
                </AttioButton>
              </div>
            </div>
          );
        })}
      </div>
    </PageChrome>
  );
}

export default function NurseQueuePage() {
  return (
    <Suspense>
      <QueueContent />
    </Suspense>
  );
}
