"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function JuniorExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.visitId as string;
  const schema = useFormSchema("junior-exam");
  const {
    getVisit,
    getPatient,
    completeJuniorExam,
    getSubmission,
    saveSubmission,
  } = useFrontdeskStore();

  const visit = getVisit(visitId);
  const patient = visit ? getPatient(visit.patientId) : undefined;
  const saved = getSubmission("junior-exam", visitId);

  if (!visit || !patient) {
    return (
      <PageChrome breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Junior exam" }]} title="Visit not found">
        <Link href="/app/frontdesk/junior-exam" className="text-[13px] text-[var(--attio-accent)]">← Back to list</Link>
      </PageChrome>
    );
  }

  const handoffPreview = saved?.data ?? {};

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Junior exam", href: "/app/frontdesk/junior-exam" },
        { label: patient.name },
      ]}
      title={`MSK intake · ${patient.name}`}
      meta={`Token #${visit.token} · Handoff to ${visit.doctorName}`}
      actions={
        <AttioButton
          variant="primary"
          className="gap-1.5"
          onClick={() => {
            if (saved) {
              completeJuniorExam(visitId, saved.data);
              router.push("/app/frontdesk/queue");
            }
          }}
        >
          <Send className="size-3.5" />
          Complete & send to doctor
        </AttioButton>
      }
    >
      <Link
        href="/app/frontdesk/junior-exam"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text)]"
      >
        <ArrowLeft className="size-4" />
        Junior exam list
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge label={visit.billing} variant={visit.billing === "paid" ? "success" : "warning"} />
        <StatusBadge label={patient.department} variant="neutral" />
        <StatusBadge label={`Exam: ${visit.exam}`} variant="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel title="Junior doctor examination">
          <SchemaForm
            schema={schema}
            formKey={`${schema.id}-${visitId}`}
            initialValues={saved?.data}
            submitLabel="Save draft"
            onSubmit={(data) => {
              saveSubmission("junior-exam", data, { visitId, patientId: patient.id });
            }}
          />
        </Panel>

        <Panel title="Handoff preview">
          <p className="text-[11px] font-semibold tracking-wide text-[var(--attio-text-tertiary)] uppercase">
            Doctor will see
          </p>
          <div className="mt-3 space-y-2 rounded-lg bg-[var(--attio-surface)] p-3 text-[13px] text-[var(--attio-text-secondary)]">
            <p><strong>Patient:</strong> {patient.name} ({patient.uhid})</p>
            <p><strong>Department:</strong> {patient.department}</p>
            <p><strong>Billing:</strong> {visit.billing}</p>
            {handoffPreview.chiefComplaint && (
              <p><strong>Complaint:</strong> {String(handoffPreview.chiefComplaint)}</p>
            )}
            {handoffPreview.juniorImpression && (
              <p><strong>Impression:</strong> {String(handoffPreview.juniorImpression)}</p>
            )}
            {handoffPreview.seniorHandoff && (
              <p><strong>Handoff:</strong> {String(handoffPreview.seniorHandoff)}</p>
            )}
            <p className="text-[var(--attio-text-tertiary)]">Full intake fields visible — no hidden data for consultant.</p>
          </div>
          <AttioButton
            variant="primary"
            className="mt-4 w-full"
            onClick={() => {
              const data = saved?.data ?? {};
              saveSubmission("junior-exam", data, { visitId, patientId: patient.id });
              completeJuniorExam(visitId, data);
              router.push("/app/frontdesk/queue");
            }}
          >
            Complete handoff
          </AttioButton>
        </Panel>
      </div>
    </PageChrome>
  );
}
