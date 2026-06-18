"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { Panel } from "@/components/frontdesk/ui";
import { APPOINTMENT_SLOTS } from "@/design-system/frontdesk-data";
import { DOCTORS_BY_DEPT } from "@/design-system/mock-data";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];

export default function AppointmentsPage() {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week">("day");
  const schema = useFormSchema("appointment");
  const { bookAppointment, appointments, getPatient, patients, saveSubmission } = useFrontdeskStore();

  const schedule = useMemo(() => {
    const doctors = [
      ...DOCTORS_BY_DEPT.dept_spine.map((d) => d.name),
      ...DOCTORS_BY_DEPT.dept_wellness.map((d) => d.name),
    ];
    const booked = appointments.map((a) => {
      const p = getPatient(a.patientId);
      return { ...a, patientName: p?.name ?? "Patient" };
    });
    return { doctors, booked };
  }, [appointments, getPatient]);

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Appointments" },
      ]}
      title="Appointments"
      meta="Spine slots: 20 min + 5 buffer · Wellness: 30 min + 10 buffer"
      actions={
        <div className="flex gap-1 rounded-lg border border-[var(--attio-border)] p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-[12px] font-medium capitalize",
                view === v ? "bg-[var(--attio-text)] text-white" : "text-[var(--attio-text-secondary)] hover:bg-[var(--attio-hover)]",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="Schedule · Wed 18 Jun 2026">
          <div className="space-y-4">
            {schedule.doctors.map((doc) => (
              <div key={doc}>
                <p className="mb-2 text-[12px] font-semibold text-[var(--attio-text-secondary)]">{doc}</p>
                <div className="flex flex-wrap gap-2">
                  {HOURS.map((h) => {
                    const hit = schedule.booked.find((b) => b.doctorName === doc && b.time === h);
                    return (
                      <div
                        key={h}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-[12px]",
                          hit
                            ? "border-[var(--attio-accent)] bg-blue-50 text-blue-800"
                            : "border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] text-[var(--attio-text-secondary)]",
                        )}
                      >
                        {h}
                        {hit && <span className="ml-1 text-[10px]">· {hit.patientName.split(" ")[0]}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Book appointment">
          <SchemaForm
            schema={schema}
            formKey={schema.id}
            initialValues={{ patient: patients[0]?.uhid ?? "" }}
            submitLabel="Book slot"
            onSubmit={(data) => {
              const { visitId } = bookAppointment(data);
              saveSubmission("appointment", data, { visitId });
              router.push(`/app/frontdesk/check-in?visit=${visitId}`);
            }}
          />
          <div className="mt-4 rounded-lg bg-[var(--attio-surface)] p-3 text-[11px] text-[var(--attio-text-tertiary)]">
            <p>Spine: {APPOINTMENT_SLOTS.dept_spine.durationMin}min slots, {APPOINTMENT_SLOTS.dept_spine.bufferMin}min buffer</p>
            <p>Wellness: {APPOINTMENT_SLOTS.dept_wellness.durationMin}min slots, {APPOINTMENT_SLOTS.dept_wellness.bufferMin}min buffer</p>
          </div>
        </Panel>
      </div>
    </PageChrome>
  );
}
