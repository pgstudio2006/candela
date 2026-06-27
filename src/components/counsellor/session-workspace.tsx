"use client";

import { HandoffPayloadView } from "@/components/counsellor/handoff-payload-view";
import { PublishedSchemaForm } from "@/components/candela/published-schema-form";
import { saveSubmissionAction } from "@/app/actions/clinical-actions";
import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PrintableQuote } from "@/components/counsellor/print/printable-quote";
import { PrintPreviewModal } from "@/components/doctor/print/print-preview-modal";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import {
  OBJECTION_TAGS,
  PACKAGE_ADDONS,
  PACKAGE_TIERS,
  type CounselQuote,
} from "@/design-system/counsellor-data";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";
import { usePublishedFormSchema } from "@/hooks/use-published-form-schema";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { isRedFlagVisit } from "@/lib/frontdesk-workflow";
import { ArrowLeft, MessageCircle, Plus, Printer, Send, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const AI_SCRIPTS: Record<string, string> = {
  en: "Based on your consultation, the doctor recommends a structured MSK care program. This addresses your lumbar disc issue with physiotherapy and monitoring. The 6-session package offers the best balance of recovery and value.",
  hi: "आपकी जांच के अनुसार, डॉक्टर ने MSK केयर प्रोग्राम की सलाह दी है। यह आपकी कमर की समस्या के लिए फिजियोथेरेपी और नियमित फॉलो-अप पर केंद्रित है।",
  hinglish: "Doctor ne recommend kiya hai MSK care program — physio sessions ke saath. 6-session package best value hai aapke case mein.",
};

type SessionWorkspaceProps = { visitId: string };

export function SessionWorkspace({ visitId }: SessionWorkspaceProps) {
  useCounsellorPoll();
  const router = useRouter();
  const { toast } = useToast();
  const {
    getQueueItem,
    getPatient,
    getVisit,
    claimSession,
    buildQuote,
    requestDiscountApproval,
    completeSession,
    maxDiscountPercent,
    discountPolicy,
    packages,
    activeCounsellorName,
    approvals,
    approvedDiscounts,
  } = useCounsellorStore();

  const item = getQueueItem(visitId);
  const patient = item ? getPatient(item.patientId) : undefined;
  const visit = getVisit(visitId);

  const [tier, setTier] = useState<"good" | "better" | "best">("better");
  const [packageId, setPackageId] = useState(item?.packageId ?? "pkg_basic");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<Array<{ id: string; label: string; amount: number; quantity: number; gstPercent: number }>>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [objections, setObjections] = useState<string[]>([]);
  const [callbackAt, setCallbackAt] = useState("");
  const [consent, setConsent] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [aiLang, setAiLang] = useState("en");
  const [aiScript, setAiScript] = useState("");
  const [emiMonths, setEmiMonths] = useState(0);
  const [corporateRef, setCorporateRef] = useState("");
  const [paymentExpectation, setPaymentExpectation] = useState<"pay_now" | "desk" | "corporate">("desk");
  const [printOpen, setPrintOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const intakeSchema = usePublishedFormSchema("counsellor-intake");
  const packageSchema = usePublishedFormSchema("counsellor-package");

  useEffect(() => {
    if (!item) return;
    setClaiming(true);
    void claimSession(visitId)
      .catch((err) => toast(String(err), "error"))
      .finally(() => setClaiming(false));
    setPackageId(String(item.packageId ?? item.payload.handoff?.packageId ?? "pkg_basic"));
  }, [item, visitId, claimSession, toast]);

  const quote = useMemo(
    () => buildQuote(visitId, packageId, addonIds, discountPercent, discountReason, tier, customServices.map(s => ({ id: s.id, label: s.label, amount: s.amount, quantity: s.quantity, gstPercent: s.gstPercent, type: "service" as const }))),
    [visitId, packageId, addonIds, discountPercent, discountReason, tier, customServices, buildQuote],
  );

  const limit = maxDiscountPercent();
  const hasApprovedDiscount = [...approvals, ...approvedDiscounts].some(
    (a) => a.visitId === visitId && a.status === "approved" && a.requestedPercent >= discountPercent,
  );
  const needsApproval =
    (discountPercent > limit || discountPercent > discountPolicy.managerApprovalAbove) && !hasApprovedDiscount;
  const needsReason = discountPercent > discountPolicy.requireReasonAbove && !discountReason.trim();

  if (!item || !patient || !visit) {
    return (
      <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Session" }]} title="Not in queue">
        <Link href="/app/counsellor/queue" className="text-[13px] text-[var(--attio-accent)]">← Queue</Link>
      </PageChrome>
    );
  }

  const applyTier = (t: typeof tier) => {
    setTier(t);
    const match = PACKAGE_TIERS.find((x) => x.id === t);
    if (match) setPackageId(match.packageId);
  };

  const toggleAddon = (id: string) => {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleObjection = (tag: string) => {
    setObjections((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const generateAiScript = () => {
    const dx = String(item.payload.diagnosis.primaryDiagnosis ?? "your condition");
    const base = AI_SCRIPTS[aiLang] ?? AI_SCRIPTS.en;
    setAiScript(`${base}\n\n(Diagnosis context: ${dx})`);
  };

  const finish = async (outcome: "converted" | "deferred" | "lost" | "callback", sendBilling = false) => {
    if (sendBilling && !consent) {
      toast("Capture patient consent before sending to billing.", "error");
      return;
    }
    if (sendBilling && needsReason) {
      toast("Enter a discount reason before sending to billing.", "error");
      return;
    }
    if (sendBilling && needsApproval) {
      toast("Request manager approval first, then retry after approval.", "error");
      await requestDiscountApproval(visitId, quote, discountReason || "Manager approval requested");
      return;
    }
    if (outcome === "callback" && !callbackAt.trim()) {
      toast("Set a callback date/time.", "error");
      return;
    }

    const result = await completeSession(visitId, outcome, {
      quote: outcome === "converted" ? { ...quote, emiMonths: emiMonths || undefined, corporateRef: corporateRef || undefined, consentCaptured: consent, whatsappSent: whatsapp } : undefined,
      internalNotes,
      objections,
      callbackAt: outcome === "callback" ? callbackAt : undefined,
      sendToBilling: sendBilling && outcome === "converted",
      paymentExpectation,
      consentCaptured: consent,
      whatsappSent: whatsapp,
      voiceNote,
      aiScript,
    });

    if (!result.ok) {
      toast(result.error ?? "Could not complete session", "error");
      return;
    }
    toast(outcome === "converted" && sendBilling ? "Sent to reception billing" : "Session saved", "success");
    router.push("/app/counsellor/queue");
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Counsellor", href: "/app/counsellor" },
        { label: "Queue", href: "/app/counsellor/queue" },
        { label: patient.name, href: `/app/counsellor/patients/${patient.id}` },
        { label: "Session" },
      ]}
      title={`Counsel · ${patient.name}`}
      meta={`${item.doctorName} · ${patient.uhid} · ${activeCounsellorName}${claiming ? " · claiming…" : ""}`}
      actions={
        <AttioButton variant="secondary" className="gap-1.5" onClick={() => setPrintOpen(true)}>
          <Printer className="size-3.5" />
          Print quote
        </AttioButton>
      }
    >
      <Link href="/app/counsellor/queue" className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text)]">
        <ArrowLeft className="size-4" />
        Queue
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        {isRedFlagVisit(visit) && <StatusBadge label="RED FLAG" variant="danger" />}
        {item.priority === "high" && <StatusBadge label="High priority" variant="warning" />}
        {visit.routingNote && (
          <span className="rounded-lg bg-amber-50 px-3 py-1 text-[12px] text-amber-900">{visit.routingNote}</span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
        {/* Left: Doctor context (read-only) */}
        <div className="space-y-4">
          <Panel title="Doctor handoff" className="sticky top-0">
            <HandoffPayloadView item={item} patient={patient} visit={visit} />
          </Panel>
        </div>

        {/* Center: Estimate builder */}
        <div className="space-y-4">
          <Panel title="AI counsel assistant" action={<Sparkles className="size-4 text-[var(--attio-accent)]" />}>
            <div className="mb-2 flex flex-wrap gap-1">
              {["en", "hi", "hinglish"].map((l) => (
                <button key={l} type="button" onClick={() => setAiLang(l)} className={cn("rounded-full border px-2 py-0.5 text-[11px] capitalize", aiLang === l ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10 text-[var(--attio-accent)]" : "border-[var(--attio-border)]")}>{l}</button>
              ))}
            </div>
            <AttioButton variant="secondary" className="mb-2 w-full gap-1.5" onClick={generateAiScript}>
              <Sparkles className="size-3.5" />
              Generate patient talk track
            </AttioButton>
            <textarea value={aiScript} onChange={(e) => setAiScript(e.target.value)} rows={4} placeholder="Patient-friendly explanation…" className="w-full resize-none rounded-lg border border-[var(--attio-border)] px-3 py-2 text-[12px]" />
          </Panel>

          <Panel title="Package presentation">
            <PublishedSchemaForm
              schema={packageSchema}
              hideSubmit
              initialValues={{
                packageTier: tier,
                emiMonths,
                discountRequested: discountPercent,
              }}
              onValuesChange={(data) => {
                const nextTier = String(data.packageTier ?? tier) as typeof tier;
                if (data.packageTier) applyTier(nextTier);
                if (data.emiMonths !== undefined) setEmiMonths(Number(data.emiMonths) || 0);
                if (data.discountRequested !== undefined) setDiscountPercent(Number(data.discountRequested) || 0);
              }}
            />
            <div className="mt-4 mb-3 grid grid-cols-3 gap-2">
              {PACKAGE_TIERS.map((t) => {
                const pkg = packages.find((p) => p.id === t.packageId)!;
                return (
                  <button key={t.id} type="button" onClick={() => applyTier(t.id)} className={cn("rounded-lg border p-2 text-left text-[11px]", tier === t.id ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/5" : "border-[var(--attio-border)]")}>
                    <p className="font-semibold">{t.label}</p>
                    <p className="mt-1 tabular-nums">₹{pkg.amount.toLocaleString("en-IN")}</p>
                    <p className="text-[var(--attio-text-tertiary)]">{pkg.sessions} sessions</p>
                  </button>
                );
              })}
            </div>
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="mb-3 w-full rounded-md border border-[var(--attio-border)] px-2 py-2 text-[13px]">
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.label} — ₹{p.amount.toLocaleString("en-IN")}</option>
              ))}
            </select>
            <div className="space-y-1">
              {PACKAGE_ADDONS.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-[var(--attio-surface)]">
                  <input type="checkbox" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                  <span className="flex-1">{a.label}</span>
                  <span className="tabular-nums text-[var(--attio-text-tertiary)]">+₹{a.amount.toLocaleString("en-IN")}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Pricing & discount">
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-[var(--attio-text-tertiary)]">Gross</span><span className="tabular-nums">₹{quote.grossAmount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-[var(--attio-text-tertiary)]">GST (18%)</span><span className="tabular-nums">₹{quote.gstAmount.toLocaleString("en-IN")}</span></div>
              <label className="block">
                <span className="text-[11px] text-[var(--attio-text-tertiary)]">Discount % (max {limit}% without approval)</span>
                <input type="number" min={0} max={30} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="mt-1 w-full rounded-md border border-[var(--attio-border)] px-2 py-1.5" />
              </label>
              {discountPercent > 0 && (
                <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Discount reason (required above 3%)" className="w-full rounded-md border border-[var(--attio-border)] px-2 py-1.5 text-[12px]" />
              )}
              {needsApproval && <StatusBadge label="Manager approval required" variant="warning" />}
              {hasApprovedDiscount && <StatusBadge label="Discount approved" variant="success" />}
              <div className="flex justify-between border-t pt-2 text-[15px] font-semibold">
                <span>Net payable</span>
                <span className="tabular-nums text-[var(--attio-accent)]">₹{quote.netAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Add custom services">
            <div className="mb-3 space-y-2">
              {customServices.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[12px]">
                  <input
                    value={s.label}
                    onChange={(e) => {
                      const updated = [...customServices];
                      updated[idx].label = e.target.value;
                      setCustomServices(updated);
                    }}
                    placeholder="Service name"
                    className="flex-1 rounded-md border border-[var(--attio-border)] px-2 py-1"
                  />
                  <input
                    type="number"
                    value={s.amount}
                    onChange={(e) => {
                      const updated = [...customServices];
                      updated[idx].amount = Number(e.target.value);
                      setCustomServices(updated);
                    }}
                    placeholder="₹"
                    className="w-20 rounded-md border border-[var(--attio-border)] px-2 py-1"
                  />
                  <input
                    type="number"
                    value={s.quantity}
                    onChange={(e) => {
                      const updated = [...customServices];
                      updated[idx].quantity = Math.max(1, Number(e.target.value));
                      setCustomServices(updated);
                    }}
                    placeholder="Qty"
                    className="w-16 rounded-md border border-[var(--attio-border)] px-2 py-1"
                  />
                  <AttioButton variant="ghost" className="!h-7 !px-1 text-red-600" onClick={() => setCustomServices(customServices.filter((_, i) => i !== idx))}>
                    <Trash2 className="size-3" />
                  </AttioButton>
                </div>
              ))}
            </div>
            <AttioButton variant="secondary" className="w-full gap-1.5" onClick={() => setCustomServices([...customServices, { id: `custom_${Date.now()}`, label: "", amount: 0, quantity: 1, gstPercent: 18 }])}>
              <Plus className="size-3.5" />
              Add service line
            </AttioButton>
          </Panel>

          <Panel title="Counselling intake">
            <PublishedSchemaForm
              schema={intakeSchema}
              initialValues={{ internalNotes }}
              submitLabel="Save intake"
              onSubmit={async (data) => {
                const notes = [data.chiefConcern, data.internalNotes, data.objectionNotes]
                  .filter(Boolean)
                  .map(String)
                  .join("\n");
                if (notes) setInternalNotes(notes);
                await saveSubmissionAction("counsellor-intake", data, {
                  visitId,
                  patientId: patient.id,
                });
                toast("Intake saved", "success");
              }}
            />
          </Panel>
        </div>

        {/* Right: Outcomes */}
        <div className="space-y-4">
          <Panel title="Session wrap-up" className="sticky top-0">
            <div className="mb-3 flex flex-wrap gap-1">
              {OBJECTION_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleObjection(tag)} className={cn("rounded-full border px-2 py-0.5 text-[10px]", objections.includes(tag) ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>{tag}</button>
              ))}
            </div>
            <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Internal counsel notes…" className="mb-3 w-full resize-none rounded-lg border px-3 py-2 text-[13px]" />
            <textarea value={voiceNote} onChange={(e) => setVoiceNote(e.target.value)} rows={2} placeholder="Voice note summary (optional)…" className="mb-3 w-full resize-none rounded-lg border px-3 py-2 text-[12px]" />
            <input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} className="mb-3 w-full rounded-md border px-2 py-1.5 text-[12px]" />
            <div className="mb-3 space-y-2 text-[12px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />Package consent captured</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} /><MessageCircle className="size-3.5" />Send WhatsApp quote on convert</label>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {(["desk", "pay_now", "corporate"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPaymentExpectation(p)} className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize", paymentExpectation === p ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>{p.replace("_", " ")}</button>
              ))}
            </div>
            <div className="grid gap-2">
              <AttioButton variant="primary" className="gap-1.5" disabled={!consent || needsReason} onClick={() => void finish("converted", true)}>
                <Send className="size-3.5" />
                Convert & send to reception
              </AttioButton>
              <AttioButton variant="secondary" onClick={() => void finish("callback")}>Schedule callback</AttioButton>
              <AttioButton variant="secondary" onClick={() => void finish("deferred")}>Deferred — needs time</AttioButton>
              <AttioButton variant="secondary" onClick={() => void finish("lost")}>Lost</AttioButton>
            </div>
          </Panel>
        </div>
      </div>

      <PrintPreviewModal open={printOpen} onClose={() => setPrintOpen(false)} title="Package quote" printId="counsel-quote-print">
        <PrintableQuote patient={patient} visit={visit} quote={quote} doctorName={item.doctorName} counsellorName={activeCounsellorName} />
      </PrintPreviewModal>
    </PageChrome>
  );
}
