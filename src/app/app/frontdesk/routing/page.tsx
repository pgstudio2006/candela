"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { formatStageStatus } from "@/lib/frontdesk-workflow";
import { ArrowRight, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RoutingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const visitId = params.get("visit") ?? "";
  const dest = params.get("dest") ?? "nursing";
  const { getVisit, getPatient } = useFrontdeskStore();

  const visit = visitId ? getVisit(visitId) : undefined;
  const patient = visit ? getPatient(visit.patientId) : undefined;

  if (!visit || !patient) {
    return (
      <PageChrome breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Routing" }]} title="Visit not found">
        <Link href="/app/frontdesk/billing" className="text-[13px] text-[var(--attio-accent)]">← Back to billing</Link>
      </PageChrome>
    );
  }

  const isIpd = visit.stage === "ipd_admitted" || visit.treatmentPath === "ipd";

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Patient routing" },
      ]}
      title="Send patient to nursing"
      meta={`${patient.name} · ${patient.uhid}`}
    >
      <div className="mx-auto max-w-xl">
        <Panel title="Routing complete">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
            <p className="text-[15px] font-semibold text-emerald-950">
              Billing closed — escort patient to the nursing counter
            </p>
            <p className="mt-2 text-[13px] text-emerald-900">
              {visit.routingNote ?? "Nursing intake, vitals, and clinical consent are required before treatment."}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <div><dt className="text-[var(--attio-text-tertiary)]">Patient</dt><dd className="font-medium">{patient.name}</dd></div>
            <div><dt className="text-[var(--attio-text-tertiary)]">UHID</dt><dd>{patient.uhid}</dd></div>
            <div><dt className="text-[var(--attio-text-tertiary)]">Stage</dt><dd>{formatStageStatus(visit.stage)}</dd></div>
            <div><dt className="text-[var(--attio-text-tertiary)]">Billing</dt><dd><StatusBadge label={visit.billing} variant={visit.billing === "paid" ? "success" : "warning"} /></dd></div>
            {visit.counselPackageLabel && (
              <div className="col-span-2"><dt className="text-[var(--attio-text-tertiary)]">Package</dt><dd>{visit.counselPackageLabel}</dd></div>
            )}
            {isIpd && (
              <div className="col-span-2"><dt className="text-[var(--attio-text-tertiary)]">Admission</dt><dd>IPD — ward intake required</dd></div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <AttioButton variant="primary" className="gap-1.5" onClick={() => router.push("/app/frontdesk/handover")}>
              <Stethoscope className="size-3.5" />
              Shift handover
            </AttioButton>
            <AttioButton variant="secondary" onClick={() => router.push("/app/frontdesk/queue")}>
              Front desk queue
            </AttioButton>
            <Link href={`/app/frontdesk/patients/${patient.id}`} className="inline-flex items-center gap-1 text-[13px] text-[var(--attio-accent)]">
              Patient record <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-[var(--attio-text-tertiary)]">
            Nursing team sees this patient on their queue automatically. Ask the patient to proceed to the nursing desk.
          </p>
        </Panel>
      </div>
    </PageChrome>
  );
}

export default function RoutingPage() {
  return (
    <Suspense>
      <RoutingContent />
    </Suspense>
  );
}
