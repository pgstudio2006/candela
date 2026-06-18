"use client";

import { ConsentWizard } from "@/components/nurse/consent-wizard";
import { NursingHandoffView } from "@/components/nurse/nursing-handoff-view";
import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { requiredConsentsComplete, TREATMENT_BAYS, consentProgress } from "@/design-system/nurse-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, HeartPulse, Play, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ExecutionWorkspaceProps = { visitId: string };

type Step = "handoff" | "vitals" | "consent" | "treatment";

const STEPS: { id: Step; label: string }[] = [
  { id: "handoff", label: "Handoff review" },
  { id: "vitals", label: "Vitals & assessment" },
  { id: "consent", label: "Clinical consent" },
  { id: "treatment", label: "Treatment execution" },
];

export function ExecutionWorkspace({ visitId }: ExecutionWorkspaceProps) {
  const router = useRouter();
  const {
    getHandoff,
    getPatient,
    getVisit,
    getEpisode,
    claimEpisode,
    saveVitals,
    startSession,
    completeSession,
    completeEpisode,
    updateEpisodeNotes,
  } = useNurseStore();

  const handoff = getHandoff(visitId);
  const patient = handoff ? getPatient(handoff.patientId) : undefined;
  const visit = getVisit(visitId);
  const episode = getEpisode(visitId);

  const [step, setStep] = useState<Step>("handoff");
  const [bay, setBay] = useState(TREATMENT_BAYS[0].id);
  const [vitals, setVitals] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    pulse: 72,
    spo2: 98,
    temperature: 36.8,
    weight: patient?.age ? 70 : undefined,
    painScore: 4,
    allergies: "None known",
    redFlags: "",
    nursingNotes: "",
  });
  const [sessionNotes, setSessionNotes] = useState("");

  useEffect(() => {
    if (handoff) claimEpisode(visitId);
  }, [handoff, visitId, claimEpisode]);

  if (!handoff || !patient) {
    return (
      <PageChrome breadcrumbs={[{ label: "Nursing" }, { label: "Episode" }]} title="Episode not found">
        <p className="text-[13px] text-[var(--attio-text-tertiary)]">No nursing handoff for this visit.</p>
        <Link href="/app/nurse/queue" className="mt-4 inline-block text-[var(--attio-accent)]">Back to queue</Link>
      </PageChrome>
    );
  }

  const consentsOk = episode ? requiredConsentsComplete(episode.consents) : false;
  const progress = episode ? consentProgress(episode.consents) : { done: 0, total: 0 };
  const activeSession = episode?.sessions.find((s) => s.status === "in_progress" || s.status === "scheduled");

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const canTreatment = consentsOk && episode?.vitals;

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Nursing", href: "/app/nurse" },
        { label: "Queue", href: "/app/nurse/queue" },
        { label: patient.name },
      ]}
      title={`Care episode · ${patient.name}`}
      meta={`${handoff.packageLabel} · ${handoff.treatmentPath.toUpperCase()} · ${handoff.doctorName}`}
      actions={
        <Link href="/app/nurse/queue" className="inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-secondary)] hover:text-[var(--attio-text)]">
          <ArrowLeft className="size-3.5" /> Queue
        </Link>
      }
    >
      {handoff.balanceDue && handoff.balanceDue > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Balance due: ₹{handoff.balanceDue.toLocaleString("en-IN")} — treatment authorized per billing policy
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              step === s.id
                ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10 text-[var(--attio-accent)]"
                : "border-[var(--attio-border)] text-[var(--attio-text-secondary)] hover:bg-[var(--attio-surface)]",
              i < stepIndex && "border-emerald-300 bg-emerald-50/50",
            )}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge label={handoff.billingStatus} variant={handoff.billingStatus === "paid" ? "success" : "warning"} />
        <StatusBadge label={`Consent ${progress.done}/${progress.total}`} variant={consentsOk ? "success" : "warning"} />
        {episode?.status && <StatusBadge label={episode.status.replace("_", " ")} variant="info" />}
      </div>

      {step === "handoff" && (
        <Panel title="Full care handoff">
          <NursingHandoffView handoff={handoff} patient={patient} visit={visit} />
          <AttioButton variant="primary" className="mt-4" onClick={() => setStep("vitals")}>
            Continue to vitals →
          </AttioButton>
        </Panel>
      )}

      {step === "vitals" && (
        <Panel title="Vitals & nursing assessment">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: "bpSystolic", label: "BP systolic" },
              { key: "bpDiastolic", label: "BP diastolic" },
              { key: "pulse", label: "Pulse" },
              { key: "spo2", label: "SpO₂ %" },
              { key: "temperature", label: "Temp °C" },
              { key: "painScore", label: "Pain (0–10)" },
            ].map(({ key, label }) => (
              <label key={key} className="block text-[12px]">
                <span className="mb-1 block text-[var(--attio-text-tertiary)]">{label}</span>
                <input
                  type="number"
                  value={vitals[key as keyof typeof vitals] as number}
                  onChange={(e) => setVitals((v) => ({ ...v, [key]: Number(e.target.value) }))}
                  className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3 tabular-nums"
                />
              </label>
            ))}
          </div>
          <label className="mt-4 block text-[12px]">
            <span className="mb-1 block text-[var(--attio-text-tertiary)]">Allergies</span>
            <input
              value={vitals.allergies}
              onChange={(e) => setVitals((v) => ({ ...v, allergies: e.target.value }))}
              className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
            />
          </label>
          <label className="mt-3 block text-[12px]">
            <span className="mb-1 block text-[var(--attio-text-tertiary)]">Red flags / contraindications</span>
            <textarea
              value={vitals.redFlags}
              onChange={(e) => setVitals((v) => ({ ...v, redFlags: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-[var(--attio-border)] px-3 py-2"
              placeholder="Neurological deficit, anticoagulation, pregnancy…"
            />
          </label>
          <label className="mt-3 block text-[12px]">
            <span className="mb-1 block text-[var(--attio-text-tertiary)]">Nursing notes</span>
            <textarea
              value={vitals.nursingNotes}
              onChange={(e) => setVitals((v) => ({ ...v, nursingNotes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-[var(--attio-border)] px-3 py-2"
            />
          </label>
          <AttioButton
            variant="primary"
            className="mt-4 gap-1.5"
            onClick={() => {
              saveVitals(visitId, vitals);
              setStep("consent");
            }}
          >
            <HeartPulse className="size-3.5" /> Save vitals & continue to consent
          </AttioButton>
        </Panel>
      )}

      {step === "consent" && (
        <Panel title="Treatment-specific clinical consent" action={<Shield className="size-4 text-[var(--attio-text-tertiary)]" />}>
          <p className="mb-4 text-[12px] text-[var(--attio-text-secondary)]">
            Commercial package consent was captured by counsellor. Nursing must complete procedure-specific consent before treatment.
          </p>
          <ConsentWizard visitId={visitId} />
          <AttioButton
            variant="primary"
            className="mt-4"
            disabled={!consentsOk}
            onClick={() => setStep("treatment")}
          >
            {consentsOk ? "All consents verified → Start treatment" : `Complete ${progress.total - progress.done} required consent(s)`}
          </AttioButton>
        </Panel>
      )}

      {step === "treatment" && (
        <div className="space-y-4">
          <Panel title="Session 1 · Treatment execution">
            {!canTreatment && (
              <p className="mb-3 text-[13px] text-amber-700">Complete vitals and verify all required consents before starting.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--attio-border-subtle)] p-3">
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">Procedure</p>
                <p className="font-medium">{handoff.packageLabel}</p>
                <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">
                  Session 1 of {activeSession?.totalSessions ?? 6}
                </p>
              </div>
              <label className="block text-[12px]">
                <span className="mb-1 block text-[var(--attio-text-tertiary)]">Treatment bay</span>
                <select
                  value={bay}
                  onChange={(e) => setBay(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3"
                  disabled={episode?.status === "in_treatment"}
                >
                  {TREATMENT_BAYS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={3}
              placeholder="Session notes — tolerance, exercises performed, patient response…"
              className="mt-3 w-full rounded-lg border border-[var(--attio-border)] px-3 py-2 text-[13px]"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {episode?.status !== "in_treatment" && (
                <AttioButton
                  variant="primary"
                  className="gap-1.5"
                  disabled={!canTreatment}
                  onClick={() => startSession(visitId, TREATMENT_BAYS.find((b) => b.id === bay)?.label ?? bay)}
                >
                  <Play className="size-3.5" /> Start session 1
                </AttioButton>
              )}
              {episode?.status === "in_treatment" && activeSession && (
                <>
                  <AttioButton
                    variant="primary"
                    className="gap-1.5"
                    onClick={() => {
                      completeSession(visitId, activeSession.id, sessionNotes);
                      completeEpisode(visitId);
                      router.push("/app/nurse/queue");
                    }}
                  >
                    <CheckCircle2 className="size-3.5" /> Complete session & close episode
                  </AttioButton>
                </>
              )}
            </div>
          </Panel>

          {episode?.vitals && (
            <Panel title="Vitals snapshot">
              <p className="text-[12px] text-[var(--attio-text-secondary)]">
                BP {episode.vitals.bpSystolic}/{episode.vitals.bpDiastolic} · Pulse {episode.vitals.pulse} · SpO₂ {episode.vitals.spo2}% · Pain {episode.vitals.painScore}/10
              </p>
            </Panel>
          )}
        </div>
      )}
    </PageChrome>
  );
}
