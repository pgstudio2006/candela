"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NursePatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { getPatient, handoffs, episodes, getEpisode } = useNurseStore();
  const patient = getPatient(id);
  const activeHandoffs = handoffs.filter((h) => h.patientId === id);
  const patientEpisodes = episodes.filter((e) => e.patientId === id);

  if (!patient) {
    return (
      <PageChrome breadcrumbs={[{ label: "Nursing" }, { label: "Patient" }]} title="Not found">
        <p className="text-[13px] text-[var(--attio-text-tertiary)]">Patient not found.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Nursing", href: "/app/nurse" },
        { label: "Patients", href: "/app/nurse/patients" },
        { label: patient.name },
      ]}
      title={patient.name}
      meta={`${patient.uhid} · Balance ₹${patient.balance.toLocaleString("en-IN")}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Active handoffs">
          {activeHandoffs.length === 0 && (
            <p className="text-[13px] text-[var(--attio-text-tertiary)]">No active nursing handoffs</p>
          )}
          {activeHandoffs.map((h) => (
            <Link
              key={h.visitId}
              href={`/app/nurse/episode/${h.visitId}`}
              className="mb-2 block rounded-lg border border-[var(--attio-border-subtle)] p-3 hover:bg-[var(--attio-surface)]"
            >
              <p className="font-medium">{h.packageLabel}</p>
              <StatusBadge label={getEpisode(h.visitId)?.status ?? "queued"} variant="info" />
            </Link>
          ))}
        </Panel>
        <Panel title="Episode history">
          {patientEpisodes.length === 0 && (
            <p className="text-[13px] text-[var(--attio-text-tertiary)]">No episodes recorded</p>
          )}
          {patientEpisodes.map((ep) => (
            <div key={ep.id} className="mb-2 rounded-lg border border-[var(--attio-border-subtle)] p-3 text-[12px]">
              <p className="font-medium">{ep.packageLabel}</p>
              <p className="text-[var(--attio-text-tertiary)]">{ep.status} · {ep.consents.filter((c) => c.status === "verified").length} consents verified</p>
            </div>
          ))}
        </Panel>
      </div>
    </PageChrome>
  );
}
