"use client";

import { HandoffPayloadView } from "@/components/counsellor/handoff-payload-view";
import { PublishedSchemaForm } from "@/components/candela/published-schema-form";
import { saveSubmissionAction } from "@/app/actions/clinical-actions";
import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { formatConsultDate } from "@/lib/doctor-records";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function CounsellorPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [tab, setTab] = useState("commercial");
  const { toast } = useToast();
  const { getPatient, visits, getPatientCommercialHistory, queue, getVisit } = useCounsellorStore();
  const patient = getPatient(patientId);
  const history = getPatientCommercialHistory(patientId);
  const activeQueue = queue.find((q) => q.patientId === patientId);

  if (!patient) {
    return <PageChrome breadcrumbs={[{ label: "Counsellor" }]} title="Not found"><Link href="/app/counsellor/patients">← Patients</Link></PageChrome>;
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Patients", href: "/app/counsellor/patients" }, { label: patient.name }]}
      title={patient.name}
      meta={`${patient.uhid} · LTV & counsel history`}
      tabs={[{ id: "commercial", label: "Commercial" }, { id: "clinical", label: "Clinical handoff" }, { id: "followup", label: "Follow-up" }]}
      activeTab={tab}
      onTabChange={setTab}
      actions={activeQueue ? <button type="button" onClick={() => router.push(`/app/counsellor/session/${activeQueue.visitId}`)} className="rounded-md bg-[var(--attio-text)] px-3 py-1.5 text-[12px] text-white">Open active session</button> : undefined}
    >
      <Link href="/app/counsellor/patients" className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)]"><ArrowLeft className="size-4" />Patients</Link>

      {tab === "commercial" && (
        <Panel title="Commercial timeline">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {history.length === 0 && <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No counsel sessions yet</li>}
            {history.map((s) => (
              <li key={s.id} className="py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <StatusBadge label={s.outcome ?? "—"} variant={s.outcome === "converted" ? "success" : "neutral"} />
                  <span className="text-[11px] text-[var(--attio-text-tertiary)]">{formatConsultDate(s.completedAt)}</span>
                </div>
                <p className="mt-1 font-medium">{s.quote?.packageLabel ?? "—"}</p>
                {s.quote && <p className="text-[12px] text-[var(--attio-accent)]">₹{s.quote.netAmount.toLocaleString("en-IN")}</p>}
                {s.internalNotes && <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">{s.internalNotes}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "clinical" && activeQueue && (
        <HandoffPayloadView item={activeQueue} patient={patient} visit={getVisit(activeQueue.visitId)!} />
      )}
      {tab === "clinical" && !activeQueue && (
        <Panel title="No active handoff"><p className="text-[13px] text-[var(--attio-text-tertiary)]">Patient not currently in counsel queue</p></Panel>
      )}

      {tab === "followup" && (
        <Panel title="Follow-up call">
          <PublishedSchemaForm
            schemaId="counsellor-followup"
            submitLabel="Save follow-up"
            onSubmit={async (data) => {
              await saveSubmissionAction("counsellor-followup", data, { patientId });
              toast("Follow-up saved", "success");
            }}
          />
        </Panel>
      )}
    </PageChrome>
  );
}
