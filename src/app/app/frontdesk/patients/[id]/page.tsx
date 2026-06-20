"use client";

import { BillingReceiptModal } from "@/components/frontdesk/billing-receipt-modal";
import { useSession } from "@/components/candela/session-provider";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatStageStatus } from "@/lib/frontdesk-workflow";
import { ArrowLeft, CreditCard, ListOrdered, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PatientRecordPage() {
  const params = useParams();
  const id = params.id as string;
  const { getPatient, getPatientVisits, visits } = useFrontdeskStore();
  const patient = getPatient(id);
  const patientVisits = patient ? getPatientVisits(patient.id) : [];
  const activeVisit = patientVisits.find((v) => !["completed", "with_doctor"].includes(v.stage));
  const { setActivePatientId } = useSession();
  const [reprintVisitId, setReprintVisitId] = useState<string | null>(null);

  useEffect(() => {
    if (patient) setActivePatientId(patient.id);
  }, [patient, setActivePatientId]);

  if (!patient) {
    return (
      <PageChrome breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Patients" }]} title="Patient not found">
        <Link href="/app/frontdesk/patients" className="text-[13px] text-[var(--attio-accent)]">← Back</Link>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Patients", href: "/app/frontdesk/patients" },
        { label: patient.name },
      ]}
      title={patient.name}
      meta={`${patient.uhid} · ${patient.age}y · ${patient.phone}`}
      actions={
        <>
          <Link href={`/app/frontdesk/patients/${patient.id}/edit`}>
            <AttioButton variant="secondary" className="gap-1"><Pencil className="size-3.5" /> Edit</AttioButton>
          </Link>
          <Link href={`/app/frontdesk/check-in?patient=${patient.id}${activeVisit ? `&visit=${activeVisit.id}` : ""}`}>
            <AttioButton variant="secondary">Check in</AttioButton>
          </Link>
          {activeVisit && (
            <Link href={`/app/frontdesk/billing?visit=${activeVisit.id}`}>
              <AttioButton variant="secondary" className="gap-1"><CreditCard className="size-3.5" /> Bill</AttioButton>
            </Link>
          )}
          <Link href="/app/frontdesk/queue">
            <AttioButton variant="primary" className="gap-1"><ListOrdered className="size-3.5" /> Queue</AttioButton>
          </Link>
        </>
      }
    >
      <Link
        href="/app/frontdesk/patients"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text)]"
      >
        <ArrowLeft className="size-4" />
        Patients
      </Link>

      <div className="mb-4 flex flex-wrap gap-1">
        {patient.tags.map((t) => (
          <StatusBadge key={t} label={t} variant="neutral" />
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Demographics">
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                <div><dt className="text-[var(--attio-text-tertiary)]">Email</dt><dd>{patient.email ?? "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Referrer</dt><dd>{patient.referrer ?? "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Referral source</dt><dd>{patient.referrerSource ?? "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Corporate ID</dt><dd>{patient.corporateId ?? "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Consent</dt><dd>{patient.consentTreatment || patient.consentData ? "On file" : "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Last visit</dt><dd>{patient.lastVisit ?? "—"}</dd></div>
                <div><dt className="text-[var(--attio-text-tertiary)]">Balance</dt><dd>{patient.balance > 0 ? `₹${patient.balance}` : "Clear"}</dd></div>
                {patient.registrationNotes && (
                  <div className="col-span-2"><dt className="text-[var(--attio-text-tertiary)]">Notes</dt><dd>{patient.registrationNotes}</dd></div>
                )}
              </dl>
            </Panel>
            <Panel title="Next best action">
              {activeVisit ? (
                <>
                  <p className="text-[13px] text-[var(--attio-text-secondary)]">
                    Active visit at <strong>{formatStageStatus(activeVisit.stage)}</strong> stage
                  </p>
                  {activeVisit.stage === "billing" && (
                    <Link href={`/app/frontdesk/billing?visit=${activeVisit.id}`} className="mt-3 inline-block">
                      <AttioButton variant="primary">Go to billing</AttioButton>
                    </Link>
                  )}
                  {activeVisit.stage === "registered" && (
                    <Link href={`/app/frontdesk/check-in?visit=${activeVisit.id}&patient=${patient.id}`} className="mt-3 inline-block">
                      <AttioButton variant="primary">Check in now</AttioButton>
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[var(--attio-text-secondary)]">No active visit — register or book appointment</p>
              )}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Panel title="Visit history">
            <ul className="space-y-2">
              {patientVisits.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] p-3 text-[13px]">
                  <div>
                    <p className="font-medium">{v.doctorName || "Unassigned"}</p>
                    <p className="text-[var(--attio-text-tertiary)]">Token #{v.token ?? "—"} · {formatStageStatus(v.stage)}</p>
                  </div>
                  <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : "warning"} />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Panel title="Billing summary">
            <p className="text-[13px] text-[var(--attio-text-secondary)]">
              Outstanding ledger: {patient.balance > 0 ? `₹${patient.balance.toLocaleString("en-IN")}` : "None"}
            </p>
            {patientVisits.filter((v) => v.billAmount).map((v) => (
              <div key={v.id} className="mt-3 rounded-lg border border-[var(--attio-border-subtle)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium">Visit {v.id}</p>
                  <StatusBadge label={v.billing} variant={v.billing === "paid" ? "success" : v.billing === "partial" ? "warning" : "neutral"} />
                  {v.treatmentPath === "ipd" && <StatusBadge label="IPD" variant="info" />}
                </div>
                <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">
                  ₹{v.billAmount?.toLocaleString("en-IN")}
                  {v.amountPaid != null && ` · paid ₹${v.amountPaid.toLocaleString("en-IN")}`}
                  {v.balanceDue ? ` · balance ₹${v.balanceDue.toLocaleString("en-IN")}` : ""}
                </p>
                {v.counselPackageLabel && (
                  <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">{v.counselPackageLabel}</p>
                )}
                {v.routingNote && (
                  <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">{v.routingNote}</p>
                )}
                {(v.billAmount ?? 0) > 0 && (
                  <AttioButton
                    variant="secondary"
                    className="mt-3 h-8 gap-1.5 text-[11px]"
                    onClick={() => setReprintVisitId(v.id)}
                  >
                    <Printer className="size-3.5" />
                    Reprint receipt
                  </AttioButton>
                )}
                {v.stage === "ipd_admitted" && (
                  <Link href="/app/doctor/ipd" className="mt-2 inline-block text-[12px] font-medium text-[var(--attio-accent)] hover:underline">
                    View IPD ward →
                  </Link>
                )}
              </div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>

      <BillingReceiptModal
        open={Boolean(reprintVisitId)}
        visitId={reprintVisitId}
        onClose={() => setReprintVisitId(null)}
      />
    </PageChrome>
  );
}
