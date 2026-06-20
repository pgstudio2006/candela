"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { BillingReceiptModal } from "@/components/frontdesk/billing-receipt-modal";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { PostCounselBillingForm } from "@/components/frontdesk/post-counsel-billing-form";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useFrontdeskPoll } from "@/hooks/use-frontdesk-poll";
import { BILLING_TEMPLATES } from "@/design-system/frontdesk-data";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function BillingContent() {
  useFrontdeskPoll();
  const router = useRouter();
  const params = useSearchParams();
  const visitParam = params.get("visit") ?? undefined;
  const schema = useFormSchema("billing");
  const { processBilling, processCounselBilling, getPendingBilling, getVisit, getPatient, saveSubmission, billingHandoffs, getBillingHandoff } =
    useFrontdeskStore();
  const { toast } = useToast();
  const [selectedVisit, setSelectedVisit] = useState(visitParam ?? "");
  const [templatePrefill, setTemplatePrefill] = useState<Record<string, string | number | boolean>>({});
  const [routingFlash, setRoutingFlash] = useState<string | null>(null);
  const [receiptVisitId, setReceiptVisitId] = useState<string | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const pending = getPendingBilling();
  const activeVisitId = selectedVisit || billingHandoffs[0]?.visitId || pending[0]?.visit.id || "";
  const counselForVisit = activeVisitId ? getBillingHandoff(activeVisitId) : undefined;
  const activeVisit = activeVisitId ? getVisit(activeVisitId) : undefined;
  const activePatient = activeVisit ? getPatient(activeVisit.patientId) : undefined;
  const isPostCounsel = Boolean(counselForVisit);

  const initialValues = useMemo(
    () => ({
      template: "bt1",
      paymentScope: "full",
      amount: counselForVisit?.quote.netAmount ?? 1500,
      discount: counselForVisit?.quote.discountPercent ?? 0,
      collectedAmount: counselForVisit?.quote.netAmount ?? 1500,
      mode: counselForVisit?.paymentExpectation === "corporate" ? "corporate" : "upi",
      customLine: counselForVisit?.quote.packageLabel ?? "",
      ...templatePrefill,
    }),
    [templatePrefill, counselForVisit],
  );

  const handleBillingSuccess = (result: {
    ok: true;
    routeHref: string;
    routingNote: string;
    visitId: string;
  }) => {
    setRoutingFlash(result.routingNote);
    setReceiptVisitId(result.visitId);
    setPendingRoute(result.routeHref);
  };

  const finishBilling = async (
    resultPromise: ReturnType<typeof processBilling>,
  ) => {
    const result = await resultPromise;
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    handleBillingSuccess(result);
  };

  const closeReceipt = () => {
    setReceiptVisitId(null);
    if (pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
    }
  };

  return (
    <>
      <PageChrome
        breadcrumbs={[
          { label: "Front Desk", href: "/app/frontdesk" },
          { label: "Billing" },
        ]}
        title={isPostCounsel ? "Post-counsellor billing" : "Billing-first OPD"}
        meta={
          isPostCounsel
            ? "Full / partial payment · OPD → IPD conversion · routing by payment state"
            : "Pay or defer — both release to doctor queue per Navayu workflow"
        }
      >
        {routingFlash && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
            {routingFlash}
            {receiptVisitId && (
              <p className="mt-1 text-[12px]">Receipt ready — print for the patient, then continue.</p>
            )}
          </div>
        )}

        {!isPostCounsel && (
          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            {BILLING_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setTemplatePrefill({ template: t.id, amount: t.amount, customLine: t.label })
                }
                className="rounded-xl border border-[var(--attio-border)] bg-white p-3 text-left transition-colors hover:border-[var(--attio-border-subtle)] hover:shadow-sm"
              >
                <p className="text-[13px] font-medium">{t.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">₹{t.amount.toLocaleString("en-IN")}</p>
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Panel
            title={
              activePatient
                ? isPostCounsel
                  ? `Package closure · ${activePatient.name}`
                  : `Bill · ${activePatient.name}`
                : "Create bill"
            }
          >
            {activeVisit && counselForVisit ? (
              <PostCounselBillingForm
                handoff={counselForVisit}
                onSubmit={async (input) => {
                  await saveSubmission("billing", input as unknown as Record<string, string | number | boolean>, {
                    visitId: activeVisit.id,
                    patientId: activeVisit.patientId,
                  });
                  void finishBilling(processCounselBilling(activeVisit.id, input));
                }}
              />
            ) : activeVisit ? (
              <SchemaForm
                schema={schema}
                formKey={`${schema.id}-${activeVisit.id}-${String(templatePrefill.template ?? "")}`}
                initialValues={initialValues}
                submitLabel="Collect payment & release to queue"
                onSubmit={async (data) => {
                  await saveSubmission("billing", data, { visitId: activeVisit.id, patientId: activeVisit.patientId });
                  void finishBilling(processBilling(activeVisit.id, data));
                }}
              />
            ) : (
              <p className="text-[13px] text-[var(--attio-text-tertiary)]">Select a patient from pending billing</p>
            )}
          </Panel>

          <div className="space-y-4">
            {billingHandoffs.length > 0 && (
              <Panel
                title="From counsellor"
                action={
                  <span className="text-[11px] text-[var(--attio-text-tertiary)]">
                    {billingHandoffs.length} handoff(s)
                  </span>
                }
              >
                <ul className="space-y-2">
                  {billingHandoffs.map((h) => (
                    <li key={h.visitId}>
                      <button
                        type="button"
                        onClick={() => setSelectedVisit(h.visitId)}
                        className={`w-full rounded-lg border p-3 text-left ${
                          selectedVisit === h.visitId
                            ? "border-[var(--attio-accent)] bg-blue-50/30"
                            : "border-[var(--attio-border-subtle)]"
                        }`}
                      >
                        <p className="text-[13px] font-medium">{h.patientName}</p>
                        <p className="text-[11px] text-[var(--attio-text-tertiary)]">{h.quote.packageLabel}</p>
                        <p className="mt-1 text-[14px] font-semibold tabular-nums text-[var(--attio-accent)]">
                          ₹{h.quote.netAmount.toLocaleString("en-IN")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {h.admissionRecommended && <StatusBadge label="IPD flagged" variant="info" />}
                          {h.paymentExpectation === "corporate" && (
                            <StatusBadge label="Corporate" variant="neutral" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--attio-text-secondary)]">{h.counselNotes}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Pending billing">
              <ul className="space-y-2">
                {pending.length === 0 && (
                  <li className="py-4 text-center text-[13px] text-[var(--attio-text-tertiary)]">All clear</li>
                )}
                {pending.map(({ visit, patient }) => (
                  <li key={visit.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedVisit(visit.id)}
                      className={`w-full rounded-lg border p-3 text-left ${
                        selectedVisit === visit.id
                          ? "border-[var(--attio-accent)] bg-blue-50/30"
                          : "border-[var(--attio-border-subtle)]"
                      }`}
                    >
                      <p className="text-[13px] font-medium">{patient.name}</p>
                      <p className="text-[11px] text-[var(--attio-text-tertiary)]">{visit.doctorName}</p>
                      <StatusBadge label={visit.billing} variant="warning" />
                      {visit.deferredReason && (
                        <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">{visit.deferredReason}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Routing guide">
              {isPostCounsel ? (
                <ul className="space-y-2 text-[12px] text-[var(--attio-text-secondary)]">
                  <li>
                    <strong className="text-[var(--attio-text)]">Full pay</strong> → nursing intake (routing screen)
                  </li>
                  <li>
                    <strong className="text-[var(--attio-text)]">Partial</strong> → balance on patient ledger
                  </li>
                  <li>
                    <strong className="text-[var(--attio-text)]">IPD convert</strong> → ward admission + doctor rounds
                  </li>
                  <li>
                    <strong className="text-[var(--attio-text)]">Defer</strong> → CRM follow-up, care plan saved
                  </li>
                </ul>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--attio-text-secondary)]">
                    Patient proceeds to queue → junior exam → doctor consult.
                  </p>
                  <Link
                    href="/app/frontdesk/queue"
                    className="mt-2 inline-block text-[13px] font-medium text-[var(--attio-accent)] hover:underline"
                  >
                    View queue →
                  </Link>
                </>
              )}
            </Panel>
          </div>
        </div>
      </PageChrome>

      <BillingReceiptModal open={Boolean(receiptVisitId)} visitId={receiptVisitId} onClose={closeReceipt} />
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}
