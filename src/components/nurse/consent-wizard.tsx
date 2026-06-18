"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { SignatureCanvas } from "@/components/nurse/signature-canvas";
import { ConsentTemplatePreview } from "@/components/nurse/nursing-handoff-view";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { CONSENT_TEMPLATES, consentProgress, type ConsentRecord } from "@/design-system/nurse-data";
import { cn } from "@/lib/utils";
import { Check, FileUp, PenLine, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";

function statusVariant(status: ConsentRecord["status"]) {
  if (status === "verified" || status === "locked") return "success" as const;
  if (status === "declined") return "danger" as const;
  if (status === "signed" || status === "uploaded") return "warning" as const;
  return "neutral" as const;
}

type ConsentWizardProps = { visitId: string };

export function ConsentWizard({ visitId }: ConsentWizardProps) {
  const { getEpisode, presentConsent, signConsent, uploadConsent, verifyConsent } = useNurseStore();
  const episode = getEpisode(visitId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign" | "upload">("sign");
  const [signerName, setSignerName] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [signature, setSignature] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!episode) return null;
  const progress = consentProgress(episode.consents);
  const active = episode.consents.find((c) => c.id === activeId) ?? episode.consents[0];

  const openConsent = (id: string) => {
    setActiveId(id);
    presentConsent(visitId, id);
  };

  const handleUpload = (file: File) => {
    if (!active) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadConsent(visitId, active.id, {
        uploadDataUrl: String(reader.result),
        uploadFileName: file.name,
        signerName: signerName || "Patient",
      });
      setSignerName("");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Panel title="Required consents" action={<span className="text-[11px] tabular-nums">{progress.done}/{progress.total}</span>}>
        <ul className="space-y-1">
          {episode.consents.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openConsent(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px]",
                  active?.id === c.id ? "bg-[var(--attio-active)]" : "hover:bg-[var(--attio-surface)]",
                )}
              >
                <span className="truncate pr-2">{c.label}</span>
                <StatusBadge label={c.status} variant={statusVariant(c.status)} />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {active && (
        <div className="space-y-4">
          <ConsentTemplatePreview templateId={active.templateId} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("sign")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px]",
                mode === "sign" ? "border-[var(--attio-accent)] bg-blue-50/50" : "border-[var(--attio-border)]",
              )}
            >
              <PenLine className="size-3.5" /> Canvas signature
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px]",
                mode === "upload" ? "border-[var(--attio-accent)] bg-blue-50/50" : "border-[var(--attio-border)]",
              )}
            >
              <FileUp className="size-3.5" /> Upload scan
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px]">
              <span className="mb-1 block text-[var(--attio-text-tertiary)]">Signer name</span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Patient / guardian name"
                className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
              />
            </label>
            {episode.treatmentPath === "ipd" && (
              <label className="block text-[12px]">
                <span className="mb-1 block text-[var(--attio-text-tertiary)]">Witness (nurse)</span>
                <input
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  placeholder="Witness name"
                  className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                />
              </label>
            )}
          </div>

          {mode === "sign" ? (
            <SignatureCanvas onCapture={setSignature} />
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--attio-border)] bg-[var(--attio-surface)] py-10"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleUpload(file);
              }}
            >
              <FileUp className="size-8 text-[var(--attio-text-tertiary)]" />
              <p className="mt-2 text-[13px] text-[var(--attio-text-secondary)]">Drop scanned consent or click to upload</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
              <AttioButton variant="secondary" className="mt-3" onClick={() => fileRef.current?.click()}>
                Choose file
              </AttioButton>
            </div>
          )}

          {active.signatureDataUrl && mode === "sign" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.signatureDataUrl} alt="Signature" className="max-h-24 rounded border" />
          )}
          {active.uploadDataUrl && mode === "upload" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.uploadDataUrl} alt="Upload" className="max-h-40 rounded border object-contain" />
          )}

          <div className="flex flex-wrap gap-2">
            {mode === "sign" && (
              <AttioButton
                variant="primary"
                className="gap-1.5"
                disabled={!signature || !signerName}
                onClick={() => {
                  signConsent(visitId, active.id, {
                    signatureDataUrl: signature,
                    signerName,
                    signerRole: "patient",
                    witnessName: witnessName || undefined,
                  });
                  setSignature("");
                }}
              >
                <PenLine className="size-3.5" /> Save signature
              </AttioButton>
            )}
            {(active.status === "signed" || active.status === "uploaded") && (
              <AttioButton variant="primary" className="gap-1.5" onClick={() => verifyConsent(visitId, active.id)}>
                <ShieldCheck className="size-3.5" /> Verify & lock
              </AttioButton>
            )}
            {active.status === "verified" && (
              <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
                <Check className="size-4" /> Verified by nurse
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
