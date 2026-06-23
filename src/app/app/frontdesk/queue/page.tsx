"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useFrontdeskPoll } from "@/hooks/use-frontdesk-poll";
import { isAwaitingConsultant, isAwaitingJuniorExam, isRedFlagVisit, patientDisplayName, sortQueueVisits } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function QueuePage() {
  useFrontdeskPoll();
  const router = useRouter();
  const { getQueueVisits, getPatient, visits, roster } = useFrontdeskStore();

  const doctors = roster.allDoctors;

  const callNext = () => {
    const next = sortQueueVisits(visits.filter(isAwaitingJuniorExam))[0];
    if (next) router.push(`/app/frontdesk/junior-exam/${next.id}`);
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Queue" },
      ]}
      title="Reception queue"
      meta="Grouped by doctor · FIFO by token · through consultant handoff"
      actions={<AttioButton variant="secondary" onClick={callNext}>Call next</AttioButton>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {doctors.map((doc) => {
          const queue = sortQueueVisits(getQueueVisits(doc.id));
          return (
            <Panel
              key={doc.id}
              title={doc.name}
              action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">{queue.length} waiting</span>}
            >
              <ul className="divide-y divide-[var(--attio-border-subtle)]">
                {queue.length === 0 && (
                  <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">Queue clear</li>
                )}
                {queue.map((v) => {
                  const p = getPatient(v.patientId);
                  if (!p) return null;
                  return (
                    <li
                      key={v.id}
                      className={cn("py-3", v.appointment && "bg-blue-50/40 -mx-4 px-4")}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-medium">
                            {v.token != null ? `#${v.token}` : "—"} · {patientDisplayName(p)}
                          </p>
                          <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{p.uhid}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-[var(--attio-text-tertiary)]">
                          <Clock className="size-3" />
                          {v.waitMin}m
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : "warning"} />
                        <StatusBadge label={`Exam ${v.exam}`} variant={v.exam === "done" ? "success" : "info"} />
                        {isAwaitingConsultant(v) && (
                          <StatusBadge label="Awaiting doctor" variant="info" />
                        )}
                        {v.appointment && <StatusBadge label="Appt" variant="info" />}
                        {isRedFlagVisit(v) && <StatusBadge label="RED FLAG" variant="warning" />}
                      </div>
                      {v.exam !== "done" && (
                        <Link href={`/app/frontdesk/junior-exam/${v.id}`} className="mt-2 inline-block text-[12px] text-[var(--attio-accent)]">
                          Junior exam →
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>
    </PageChrome>
  );
}
