"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { DOCTOR_SCHEDULE_BLOCKS } from "@/design-system/doctor-data";
import { formatStageStatus } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";

export default function DoctorSchedulePage() {
  const { activeDoctorId, visits } = useDoctorStore();
  const block = DOCTOR_SCHEDULE_BLOCKS.find((b) => b.doctorId === activeDoctorId)
    ?? DOCTOR_SCHEDULE_BLOCKS[0];

  const booked = visits
    .filter((v) => v.doctorId === activeDoctorId && v.appointment)
    .map((v) => v.appointmentTime)
    .filter(Boolean);

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "Schedule" },
      ]}
      title="Today's schedule"
      meta={`${block.date} · OPD slots`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OPD time slots">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {block.slots.map((slot) => {
              const taken = booked.includes(slot);
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
            {visits
              .filter((v) => v.doctorId === activeDoctorId && v.appointment)
              .map((v) => (
                <li key={v.id} className="flex items-center justify-between py-3 text-[13px]">
                  <span>{v.appointmentTime}</span>
                  <StatusBadge label={`Token #${v.token}`} variant="info" />
                  <span className="text-[var(--attio-text-secondary)]">{formatStageStatus(v.stage)}</span>
                </li>
              ))}
            {visits.filter((v) => v.doctorId === activeDoctorId && v.appointment).length === 0 && (
              <li className="py-6 text-center text-[var(--attio-text-tertiary)]">No appointments</li>
            )}
          </ul>
        </Panel>
      </div>
    </PageChrome>
  );
}
