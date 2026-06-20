"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useDoctorPoll } from "@/hooks/use-doctor-poll";
import { formatStageStatus, patientDisplayName } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DEFAULT_SLOTS = [
  "09:00", "09:20", "09:40", "10:00", "10:20", "10:40",
  "11:00", "11:20", "11:40", "12:00", "12:20", "12:40",
  "14:00", "14:20", "14:40", "15:00", "15:20", "15:40",
  "16:00", "16:20", "16:40", "17:00",
];

export default function DoctorSchedulePage() {
  useDoctorPoll();
  const { activeDoctorId, visits, getPatient } = useDoctorStore();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const appointments = visits
    .filter((v) => v.doctorId === activeDoctorId && v.appointment)
    .sort((a, b) => String(a.appointmentTime).localeCompare(String(b.appointmentTime)));

  const booked = new Set(appointments.map((v) => v.appointmentTime).filter(Boolean));
  const slots = [...new Set([...DEFAULT_SLOTS, ...booked])].sort();

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "Schedule" },
      ]}
      title="Today's schedule"
      meta={`${today} · ${appointments.length} appointment(s)`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OPD time slots">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const taken = booked.has(slot);
              return (
                <div
                  key={slot}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-center text-[13px]",
                    taken
                      ? "border-[var(--attio-accent)]/30 bg-[var(--attio-accent)]/5 text-[var(--attio-accent)]"
                      : "border-[var(--attio-border-subtle)] text-[var(--attio-text-secondary)]",
                  )}
                >
                  {slot}
                  {taken && <p className="mt-0.5 text-[10px]">Booked</p>}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Appointments today">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {appointments.length === 0 && (
              <li className="py-6 text-center text-[var(--attio-text-tertiary)]">No appointments booked</li>
            )}
            {appointments.map((v) => {
              const p = getPatient(v.patientId);
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                  <span className="font-medium">{v.appointmentTime}</span>
                  <Link
                    href={`/app/doctor/patients/${v.patientId}`}
                    className="text-[var(--attio-text-secondary)] hover:text-[var(--attio-accent)]"
                  >
                    {p ? patientDisplayName(p) : v.patientId}
                  </Link>
                  <StatusBadge label={`Token #${v.token}`} variant="info" />
                  <StatusBadge label={formatStageStatus(v.stage)} variant="neutral" />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </PageChrome>
  );
}
