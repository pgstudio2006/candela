"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { StatusBadge } from "@/components/frontdesk/ui";
import { formatExamStatus, patientDisplayName } from "@/lib/frontdesk-workflow";
import Link from "next/link";

export default function JuniorExamListPage() {
  const { getJuniorExamVisits, getPatient } = useFrontdeskStore();
  const exams = getJuniorExamVisits();

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Junior exam" },
      ]}
      title="Junior doctor exam"
      meta="MSK intake before senior consultation — completed exams stay visible until doctor consult"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exams.length === 0 && (
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">No patients in junior exam pipeline</p>
        )}
        {exams.map((v) => {
          const p = getPatient(v.patientId);
          if (!p) return null;
          return (
            <Link
              key={v.id}
              href={`/app/frontdesk/junior-exam/${v.id}`}
              className="rounded-xl border border-[var(--attio-border)] bg-white p-4 shadow-sm transition-all hover:border-[var(--attio-border-subtle)] hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-semibold">{patientDisplayName(p)}</p>
                  <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{p.uhid} · Token #{v.token}</p>
                </div>
                <StatusBadge
                  label={formatExamStatus(v.exam)}
                  variant={(v.exam ?? "not_started") === "done" ? "success" : v.exam === "in_progress" ? "info" : "neutral"}
                />
              </div>
              <p className="mt-2 text-[12px] text-[var(--attio-text-tertiary)]">{v.doctorName} · {p.department}</p>
              <p className="mt-3 text-[12px] font-medium text-[var(--attio-accent)]">Open intake →</p>
            </Link>
          );
        })}
      </div>
    </PageChrome>
  );
}
