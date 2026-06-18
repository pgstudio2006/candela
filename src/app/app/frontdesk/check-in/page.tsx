"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function CheckInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitParam = params.get("visit") ?? undefined;
  const patientParam = params.get("patient") ?? undefined;
  const schema = useFormSchema("checkin");
  const {
    checkInVisit,
    getPatient,
    getVisit,
    getWaitingCheckIns,
    patients,
    saveSubmission,
  } = useFrontdeskStore();

  const prefill = useMemo(() => {
    const visit = visitParam ? getVisit(visitParam) : undefined;
    const patient = patientParam
      ? getPatient(patientParam)
      : visit
        ? getPatient(visit.patientId)
        : undefined;
    if (!patient && !visit) return undefined;
    return {
      uhid: patient?.uhid ?? "",
      department: visit?.departmentId ?? patient?.departmentId ?? "dept_spine",
      doctor: visit?.doctorId ?? "dr_1",
    };
  }, [visitParam, patientParam, getPatient, getVisit]);

  const waiting = getWaitingCheckIns();

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Check-in" },
      ]}
      title="Check-in"
      meta="Verify arrival → assign doctor → route to billing-first OPD"
      actions={<AttioButton variant="secondary">Kiosk mode</AttioButton>}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Check-in form">
          <SchemaForm
            schema={schema}
            formKey={`${schema.id}-${visitParam ?? "new"}`}
            initialValues={prefill}
            submitLabel="Complete check-in → Billing"
            onSubmit={(data) => {
              const { visitId } = checkInVisit(data, visitParam);
              saveSubmission("checkin", data, { visitId });
              router.push(`/app/frontdesk/billing?visit=${visitId}`);
            }}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Waiting to check in">
            <ul className="space-y-2">
              {waiting.length === 0 && (
                <li className="py-4 text-center text-[13px] text-[var(--attio-text-tertiary)]">No pending arrivals</li>
              )}
              {waiting.map(({ visit, patient }) => (
                <li key={visit.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/app/frontdesk/check-in?visit=${visit.id}&patient=${patient.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--attio-border-subtle)] p-3 text-left hover:bg-[var(--attio-hover)]"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-[var(--attio-surface)]">
                      <User className="size-4 text-[var(--attio-text-tertiary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{patient.name}</p>
                      <p className="text-[11px] text-[var(--attio-text-tertiary)]">{visit.doctorName || "Assign doctor"}</p>
                    </div>
                    {visit.appointment ? (
                      <StatusBadge label={visit.appointmentTime ?? "Appt"} variant="info" />
                    ) : (
                      <StatusBadge label="Walk-in" variant="neutral" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Quick arrivals">
            {patients.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/app/frontdesk/check-in?patient=${p.id}`)}
                className="mb-2 flex w-full items-center gap-2 rounded-lg bg-[var(--attio-surface)] px-3 py-2 text-left text-[13px] hover:bg-[var(--attio-hover)]"
              >
                {p.name}
              </button>
            ))}
          </Panel>
        </div>
      </div>
    </PageChrome>
  );
}

export default function CheckInPage() {
  return (
    <Suspense>
      <CheckInContent />
    </Suspense>
  );
}
