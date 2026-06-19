"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { AiScribePanel } from "@/components/doctor/ai-scribe-panel";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PrintablePrescription } from "@/components/doctor/print/printable-prescription";
import { PrintPreviewModal } from "@/components/doctor/print/print-preview-modal";
import { PrescriptionEditor } from "@/components/doctor/prescription-editor";
import { useDoctorFormSchema } from "@/components/doctor/use-doctor-form-schema";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { TreatmentMode } from "@/design-system/doctor-data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageCircle,
  Printer,
  Send,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { id: "examination", label: "Examination" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "treatment", label: "Treatment" },
  { id: "prescription", label: "Prescription" },
  { id: "handoff", label: "Handoff" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ConsultationWorkspaceProps = {
  visitId: string;
};

export function ConsultationWorkspace({ visitId }: ConsultationWorkspaceProps) {
  const router = useRouter();
  const {
    getVisit,
    getPatient,
    getConsultation,
    startConsultation,
    saveConsultSection,
    setPrescription,
    applyTemplate,
    setScribeTranscript,
    applyScribeToExamination,
    updateConsultation,
    completeConsultation,
    templates,
    packages,
  } = useDoctorStore();

  const [tab, setTab] = useState<TabId>("examination");
  const [scribeApplied, setScribeApplied] = useState(false);
  const [handoffValues, setHandoffValues] = useState<Record<string, string | number | boolean>>({});
  const [treatmentMode, setTreatmentMode] = useState<TreatmentMode>("opd");
  const [recommendCounsellor, setRecommendCounsellor] = useState(true);
  const [skipCounsellor, setSkipCounsellor] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const visit = getVisit(visitId);
  const patient = visit ? getPatient(visit.patientId) : undefined;

  const juniorExamSchema = useFormSchema("junior-exam");
  const examSchema = juniorExamSchema;
  const dxSchema = useDoctorFormSchema("doctor-diagnosis");
  const txSchema = useDoctorFormSchema("doctor-treatment");
  const handoffSchema = useDoctorFormSchema("doctor-handoff");

  useEffect(() => {
    if (visit) startConsultation(visitId);
  }, [visit, visitId, startConsultation]);

  const consult = getConsultation(visitId);

  useEffect(() => {
    if (consult) {
      setTreatmentMode(consult.treatmentMode);
      setRecommendCounsellor(consult.recommendCounsellor);
      setSkipCounsellor(consult.skipCounsellor);
      setNotes(consult.notes);
      setCompleted(consult.status === "completed");
    }
  }, [consult]);

  if (!visit || !patient) {
    return (
      <PageChrome
        breadcrumbs={[{ label: "Doctor", href: "/app/doctor" }, { label: "Consult" }]}
        title="Visit not found"
      >
        <Link href="/app/doctor/queue" className="text-[13px] text-[var(--attio-accent)]">
          ← Back to queue
        </Link>
      </PageChrome>
    );
  }

  const finishConsult = () => {
    completeConsultation(visitId, {
      treatmentMode,
      recommendCounsellor,
      skipCounsellor,
      handoff: handoffValues,
      sendWhatsapp,
    });
    setCompleted(true);
    router.push("/app/doctor/queue");
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "OPD queue", href: "/app/doctor/queue" },
        { label: patient.name, href: `/app/doctor/patients/${patient.id}` },
      ]}
      title={`Consultation · ${patient.name}`}
      meta={`Token #${visit.token} · ${patient.uhid} · ${visit.billing} billing`}
      tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      actions={
        !completed && (
          <AttioButton variant="primary" className="gap-1.5" onClick={finishConsult}>
            <Send className="size-3.5" />
            Complete consult
          </AttioButton>
        )
      }
    >
      <Link
        href="/app/doctor/queue"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text)]"
      >
        <ArrowLeft className="size-4" />
        OPD queue
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge label={visit.billing} variant={visit.billing === "paid" ? "success" : "warning"} />
        <StatusBadge label={`Exam: ${visit.exam}`} variant={visit.exam === "done" ? "success" : "info"} />
        <StatusBadge label={patient.department} variant="neutral" />
        {visit.deferredReason && <StatusBadge label="Deferred billing" variant="warning" />}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--attio-border)] bg-white px-4 py-3">
        <span className="text-[12px] font-medium text-[var(--attio-text-secondary)]">Treatment mode</span>
        {(["opd", "ipd", "daycare"] as TreatmentMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setTreatmentMode(mode);
              updateConsultation(visitId, { treatmentMode: mode });
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] capitalize transition-colors",
              treatmentMode === mode
                ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10 text-[var(--attio-accent)]"
                : "border-[var(--attio-border)] text-[var(--attio-text-secondary)] hover:bg-[var(--attio-hover)]",
            )}
          >
            {mode}
          </button>
        ))}

        <div className="ml-auto flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-[var(--attio-text-secondary)]">
            <input
              type="checkbox"
              checked={recommendCounsellor}
              onChange={(e) => {
                setRecommendCounsellor(e.target.checked);
                updateConsultation(visitId, { recommendCounsellor: e.target.checked });
              }}
            />
            Recommend counsellor
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-[var(--attio-text-secondary)]">
            <input
              type="checkbox"
              checked={skipCounsellor}
              onChange={(e) => {
                setSkipCounsellor(e.target.checked);
                updateConsultation(visitId, { skipCounsellor: e.target.checked });
              }}
            />
            Skip counsellor
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-[var(--attio-text-secondary)]">
            <input
              type="checkbox"
              checked={sendWhatsapp}
              onChange={(e) => setSendWhatsapp(e.target.checked)}
            />
            <MessageCircle className="size-3.5" />
            WhatsApp Rx
          </label>
        </div>
      </div>

      {tab === "examination" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel title="Examination (same as junior doctor intake)">
            <SchemaForm
              schema={examSchema}
              formKey={`exam-${visitId}-${consult?.startedAt ?? ""}`}
              initialValues={consult?.examination}
              submitLabel="Save examination"
              onSubmit={(data) => saveConsultSection(visitId, "examination", data)}
            />
          </Panel>
          <AiScribePanel
            language={consult?.scribeLanguage ?? "en"}
            transcript={consult?.scribeTranscript ?? ""}
            applied={scribeApplied}
            onLanguageChange={(lang) =>
              setScribeTranscript(visitId, consult?.scribeTranscript ?? "", lang)
            }
            onTranscriptChange={(text) =>
              setScribeTranscript(visitId, text, consult?.scribeLanguage ?? "en")
            }
            onApprove={() => {
              applyScribeToExamination(visitId);
              setScribeApplied(true);
            }}
          />
        </div>
      )}

      {tab === "diagnosis" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Panel title="Diagnosis">
            <SchemaForm
              schema={dxSchema}
              formKey={`dx-${visitId}`}
              initialValues={consult?.diagnosis}
              submitLabel="Save diagnosis"
              onSubmit={(data) => saveConsultSection(visitId, "diagnosis", data)}
            />
          </Panel>
          <Panel title="Templates">
            <p className="mb-3 text-[12px] text-[var(--attio-text-secondary)]">
              Apply disease template — fills diagnosis, treatment & Rx
            </p>
            <ul className="space-y-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(visitId, tpl.id)}
                  className="flex w-full items-start gap-2 rounded-lg border border-[var(--attio-border-subtle)] px-3 py-2.5 text-left hover:bg-[var(--attio-surface)]"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-[var(--attio-accent)]" />
                  <div>
                    <p className="text-[13px] font-medium">{tpl.label}</p>
                    <p className="text-[11px] text-[var(--attio-text-tertiary)]">{tpl.disease}</p>
                  </div>
                </button>
              ))}
            </ul>
            <Link
              href="/app/doctor/templates"
              className="mt-3 inline-block text-[12px] text-[var(--attio-accent)]"
            >
              + Create your own template
            </Link>
          </Panel>
        </div>
      )}

      {tab === "treatment" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Panel title="Treatment plan">
            <SchemaForm
              schema={txSchema}
              formKey={`tx-${visitId}`}
              initialValues={consult?.treatment}
              submitLabel="Save treatment"
              onSubmit={(data) => saveConsultSection(visitId, "treatment", data)}
            />
          </Panel>
          <Panel title="Care packages">
            <ul className="space-y-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => updateConsultation(visitId, { packageId: pkg.id })}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-[var(--attio-hover)]",
                    consult?.packageId === pkg.id && "border-[var(--attio-accent)] bg-blue-50/50",
                  )}
                >
                  <p className="text-[13px] font-medium">{pkg.label}</p>
                  <p className="text-[12px] text-[var(--attio-text-tertiary)]">
                    ₹{pkg.amount.toLocaleString("en-IN")} · {pkg.sessions} sessions
                  </p>
                </button>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "prescription" && consult && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <AttioButton variant="secondary" className="gap-1.5" onClick={() => setPrintOpen(true)}>
              <Printer className="size-3.5" />
              Preview & print
            </AttioButton>
          </div>
          <Panel title="Prescription (e-Rx) — fully editable">
            <PrescriptionEditor
              lines={consult.prescription}
              onChange={(lines) => setPrescription(visitId, lines)}
            />
            {sendWhatsapp && (
              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[var(--attio-accent)]">
                <MessageCircle className="size-3.5" />
                Rx will be sent to {patient.phone} on completion · saved to patient profile
              </p>
            )}
          </Panel>
          <PrintPreviewModal
            open={printOpen}
            onClose={() => setPrintOpen(false)}
            title="Prescription"
            printId="consult-rx-print"
          >
            <PrintablePrescription
              patient={patient}
              visit={visit}
              consult={consult}
              doctorName={visit.doctorName}
            />
          </PrintPreviewModal>
        </div>
      )}

      {tab === "handoff" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Panel title="Counsellor handoff">
            <SchemaForm
              schema={handoffSchema}
              formKey={`handoff-${visitId}`}
              initialValues={handoffValues}
              submitLabel="Save handoff notes"
              onSubmit={(data) => {
                setHandoffValues(data);
                updateConsultation(visitId, { handoff: data });
              }}
            />
          </Panel>
          <Panel title="Complete consultation">
            <div className="space-y-4 text-[13px] text-[var(--attio-text-secondary)]">
              <p>
                {recommendCounsellor && !skipCounsellor
                  ? "Patient moves to counsellor queue with full consult payload."
                  : "Patient marked completed — no counsellor handoff."}
              </p>
              {visit.deferredReason && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                  Billing deferred: {visit.deferredReason}
                </p>
              )}
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  updateConsultation(visitId, { notes: e.target.value });
                }}
                rows={4}
                placeholder="Private consult notes…"
                className="w-full resize-none rounded-lg border border-[var(--attio-border)] px-3 py-2 text-[13px] outline-none"
              />
              <AttioButton variant="primary" className="w-full gap-1.5" onClick={finishConsult}>
                {recommendCounsellor && !skipCounsellor ? (
                  <>
                    <Send className="size-3.5" />
                    Send to counsellor
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Complete without counsellor
                  </>
                )}
              </AttioButton>
              {recommendCounsellor && (
                <AttioButton
                  variant="secondary"
                  className="w-full gap-1.5"
                  onClick={() => {
                    setSkipCounsellor(true);
                    updateConsultation(visitId, { skipCounsellor: true });
                    finishConsult();
                  }}
                >
                  <SkipForward className="size-3.5" />
                  Skip counsellor & finish
                </AttioButton>
              )}
            </div>
          </Panel>
        </div>
      )}
    </PageChrome>
  );
}
