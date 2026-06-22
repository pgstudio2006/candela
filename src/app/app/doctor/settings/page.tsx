"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function DoctorSettingsPage() {
  const { profile, activeDoctorId, consultations, templates } = useDoctorStore();
  const myTemplates = templates.filter((t) => t.doctorId === activeDoctorId);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Doctor", href: "/app/doctor" }, { label: "My profile" }]}
      title="My profile"
      meta="Private doctor workspace — your queue, patients, and templates only"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Name</dt>
              <dd className="font-medium">{profile.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Login email</dt>
              <dd className="font-mono text-[12px]">{profile.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Doctor ID</dt>
              <dd className="font-mono text-[12px]">{activeDoctorId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Departments</dt>
              <dd>{profile.departmentLabels.join(", ") || "—"}</dd>
            </div>
            {profile.licenseNo && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--attio-text-tertiary)]">License</dt>
                <dd>{profile.licenseNo}</dd>
              </div>
            )}
          </dl>
        </Panel>

        <Panel title="Your workspace data">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Consultations recorded</dt>
              <dd className="tabular-nums">{consultations.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--attio-text-tertiary)]">Personal templates</dt>
              <dd className="tabular-nums">{myTemplates.length}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--attio-text-tertiary)]">
            Each doctor signs in with their own email and password. You only see patients routed to you,
            your OPD queue, your consult records, and templates you created — not other doctors&apos; data.
          </p>
        </Panel>
      </div>
    </PageChrome>
  );
}
