"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { queueWaitMinutes } from "@/design-system/counsellor-data";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CounsellorDashboardPage() {
  const router = useRouter();
  const { getDashboardKpis, getFilteredQueue, getPatient, approvals } = useCounsellorStore();
  const kpis = getDashboardKpis();
  const queue = getFilteredQueue();
  const next = queue[0];

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Dashboard" }]}
      title="Counsel command center"
      meta="Full doctor handoff · package conversion · billing closure"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={() => next && router.push(`/app/counsellor/session/${next.visitId}`)}>
          <Zap className="size-3.5" />
          {next ? "Start next counsel" : "View queue"}
        </AttioButton>
      }
    >
      <MetricStrip metrics={kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Counsel queue">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {queue.length === 0 && <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">Queue clear — complete a doctor consult with counsellor handoff</li>}
            {queue.slice(0, 5).map((q) => {
              const p = getPatient(q.patientId);
              return (
                <li key={q.id}>
                  <Link href={`/app/counsellor/session/${q.visitId}`} className="flex items-center justify-between py-3 hover:bg-[var(--attio-surface)]">
                    <div>
                      <p className="text-[13px] font-medium">{p?.name}</p>
                      <p className="text-[11px] text-[var(--attio-text-tertiary)]">{q.doctorName} · {queueWaitMinutes(q.sentAt)}m wait</p>
                    </div>
                    <StatusBadge label={q.priority} variant={q.priority === "high" ? "warning" : "neutral"} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Pending discount approvals">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {approvals.length === 0 && <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No pending approvals</li>}
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-[13px]">
                <span>{a.patientName} · {a.requestedPercent}%</span>
                <Link href="/app/counsellor/approvals" className="text-[var(--attio-accent)]">Review</Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PageChrome>
  );
}
