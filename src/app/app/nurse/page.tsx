"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { queueWaitMinutes } from "@/design-system/nurse-data";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NurseDashboardPage() {
  const router = useRouter();
  const { getDashboardKpis, getQueue, getPatient, getEpisode } = useNurseStore();
  const kpis = getDashboardKpis();
  const queue = getQueue();
  const next = queue[0];

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Dashboard" }]}
      title="Treatment execution command"
      meta="Vitals · clinical consent · session 1 · full care handoff"
      actions={
        <AttioButton
          variant="primary"
          className="gap-1.5"
          onClick={() => next && router.push(`/app/nurse/episode/${next.visitId}`)}
        >
          <Zap className="size-3.5" />
          {next ? "Start next intake" : "View queue"}
        </AttioButton>
      }
    >
      <MetricStrip metrics={kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Execution queue">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {queue.length === 0 && (
              <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                Queue clear — patients arrive after post-counsellor billing
              </li>
            )}
            {queue.slice(0, 6).map((h) => {
              const ep = getEpisode(h.visitId);
              const p = getPatient(h.patientId);
              return (
                <li key={h.visitId}>
                  <Link
                    href={`/app/nurse/episode/${h.visitId}`}
                    className="flex items-center justify-between py-3 hover:bg-[var(--attio-surface)]"
                  >
                    <div>
                      <p className="text-[13px] font-medium">{p?.name ?? h.patientName}</p>
                      <p className="text-[11px] text-[var(--attio-text-tertiary)]">
                        {h.packageLabel} · {queueWaitMinutes(h.sentAt)}m wait
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <StatusBadge label={h.treatmentPath} variant="info" />
                      {ep && <StatusBadge label={ep.status} variant="neutral" />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Workflow gates">
          <ol className="space-y-3 text-[13px] text-[var(--attio-text-secondary)]">
            <li className="flex gap-2">
              <span className="font-medium text-[var(--attio-text)]">1.</span>
              Review full doctor + counsellor + billing handoff
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-[var(--attio-text)]">2.</span>
              Capture vitals & nursing assessment
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-[var(--attio-text)]">3.</span>
              Treatment-specific consent — sign or upload scan
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-[var(--attio-text)]">4.</span>
              Verify consents → start session 1 in treatment bay
            </li>
          </ol>
          <Link href="/app/nurse/consent" className="mt-4 inline-block text-[13px] font-medium text-[var(--attio-accent)] hover:underline">
            View consent registry →
          </Link>
        </Panel>
      </div>
    </PageChrome>
  );
}
