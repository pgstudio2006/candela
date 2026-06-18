"use client";

import { HandoffPayloadView } from "@/components/counsellor/handoff-payload-view";
import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PrintableQuote } from "@/components/counsellor/print/printable-quote";
import { PrintPreviewModal } from "@/components/doctor/print/print-preview-modal";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import {
  CARE_PACKAGES,
  OBJECTION_TAGS,
  PACKAGE_ADDONS,
  PACKAGE_TIERS,
  type CounselQuote,
} from "@/design-system/counsellor-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageCircle, Printer, Send, Sparkles } from "lucide-react";
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
  const router = useRouter();
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
  } = useCounsellorStore();

  const item = getQueueItem(visitId);
  const patient = item ? getPatient(item.patientId) : undefined;
  const visit = getVisit(visitId);

  const [tier, setTier] = useState<"good" | "better" | "best">("better");
  const [packageId, setPackageId] = useState(item?.packageId ?? "pkg_basic");
  const [addonIds, setAddonIds] = useState<string[]>([]);
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
  const [talkTrackOpen, setTalkTrackOpen] = useState(true);

  useEffect(() => {
    if (item) {
      claimSession(visitId);
      setPackageId(String(item.packageId ?? item.payload.handoff?.packageId ?? "pkg_basic"));
    }
  }, [item, visitId, claimSession]);

  const quote = useMemo(
    () => buildQuote(visitId, packageId, addonIds, discountPercent, discountReason, tier),
    [visitId, packageId, addonIds, discountPercent, discountReason, tier, buildQuote],
  );

  const limit = maxDiscountPercent();
  const needsApproval = discountPercent > limit || discountPercent > discountPolicy.managerApprovalAbove;
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

  const finish = (outcome: "converted" | "deferred" | "lost" | "callback", sendBilling = false) => {
    if (sendBilling && (!consent || needsApproval)) return;
    if (needsReason && sendBilling) return;
    if (needsApproval && sendBilling) {
      requestDiscountApproval(visitId, quote, discountReason || "Manager approval requested");
    }
    completeSession(visitId, outcome, {
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
    router.push(outcome === "converted" && sendBilling ? "/app/counsellor/queue" : "/app/counsellor/queue");
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
      meta={`${item.doctorName} · ${patient.uhid} · full handoff visible`}
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

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div>
          <HandoffPayloadView item={item} patient={patient} visit={visit} />
        </div>

        <div className="space-y-4">
          {talkTrackOpen && (
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
              <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">Compliance: verify promises match doctor treatment plan before patient conversation.</p>
            </Panel>
          )}

          <Panel title="Package proposal">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PACKAGE_TIERS.map((t) => {
                const pkg = CARE_PACKAGES.find((p) => p.id === t.packageId)!;
                return (
                  <button key={t.id} type="button" onClick={() => applyTier(t.id)} className={cn("rounded-lg border p-2 text-left text-[11px]", tier === t.id ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/5" : "border-[var(--attio-border)]")}>
                    <p className="font-semibold">{t.label}</p>
                    <p className="mt-1 tabular-nums">₹{pkg.amount.toLocaleString("en-IN")}</p>
                    <p className="text-[var(--attio-text-tertiary)]">{pkg.sessions} sessions</p>
                  </button>
                );
              })}
            </div>
            <label className="mb-2 block text-[11px] text-[var(--attio-text-tertiary)]">Or select package</label>
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="mb-3 w-full rounded-md border border-[var(--attio-border)] px-2 py-2 text-[13px]">
              {CARE_PACKAGES.map((p) => (
                <option key={p.id} value={p.id}>{p.label} — ₹{p.amount.toLocaleString("en-IN")}</option>
              ))}
            </select>
            <p className="mb-2 text-[11px] font-medium text-[var(--attio-text-tertiary)] uppercase">Add-ons</p>
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
              <label className="block">
                <span className="text-[11px] text-[var(--attio-text-tertiary)]">Discount % (max {limit}% without approval)</span>
                <input type="number" min={0} max={30} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="mt-1 w-full rounded-md border border-[var(--attio-border)] px-2 py-1.5" />
              </label>
              {discountPercent > 0 && (
                <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Discount reason (required above 3%)" className="w-full rounded-md border border-[var(--attio-border)] px-2 py-1.5 text-[12px]" />
              )}
              {needsApproval && <StatusBadge label="Manager approval required" variant="warning" />}
              <div className="flex justify-between border-t pt-2 text-[15px] font-semibold">
                <span>Net payable</span>
                <span className="tabular-nums text-[var(--attio-accent)]">₹{quote.netAmount.toLocaleString("en-IN")}</span>
              </div>
              <label className="flex items-center gap-2 text-[12px]">
                <span>EMI months</span>
                <select value={emiMonths} onChange={(e) => setEmiMonths(Number(e.target.value))} className="rounded border px-2 py-1">
                  <option value={0}>None</option>
                  <option value={3}>3</option>
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                </select>
              </label>
              <input value={corporateRef} onChange={(e) => setCorporateRef(e.target.value)} placeholder="Corporate / TPA reference (optional)" className="w-full rounded-md border px-2 py-1.5 text-[12px]" />
            </div>
          </Panel>

          <Panel title="Session wrap-up">
            <p className="mb-2 text-[11px] font-medium text-[var(--attio-text-tertiary)] uppercase">Objections</p>
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
              <label className="flex items-center gap-2"><input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} /><MessageCircle className="size-3.5" />Send WhatsApp quote</label>
            </div>
            <p className="mb-2 text-[11px] text-[var(--attio-text-tertiary)]">Payment expectation</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {(["desk", "pay_now", "corporate"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPaymentExpectation(p)} className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize", paymentExpectation === p ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10" : "border-[var(--attio-border)]")}>{p.replace("_", " ")}</button>
              ))}
            </div>
            <div className="grid gap-2">
              <AttioButton variant="primary" className="gap-1.5" disabled={!consent || needsReason} onClick={() => finish("converted", true)}>
                <Send className="size-3.5" />
                Convert & send to reception
              </AttioButton>
              <AttioButton variant="secondary" onClick={() => finish("callback")}>Schedule callback</AttioButton>
              <AttioButton variant="secondary" onClick={() => finish("deferred")}>Deferred — needs time</AttioButton>
              <AttioButton variant="secondary" onClick={() => finish("lost")}>Lost</AttioButton>
            </div>
          </Panel>
        </div>
      </div>

      <PrintPreviewModal open={printOpen} onClose={() => setPrintOpen(false)} title="Package quote" printId="counsel-quote-print">
        <PrintableQuote patient={patient} visit={visit} quote={quote} doctorName={item.doctorName} counsellorName="Priya Sharma" />
      </PrintPreviewModal>
    </PageChrome>
  );
}
