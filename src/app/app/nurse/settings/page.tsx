"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function NurseSettingsPage() {
  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Settings" }]}
      title="Nursing settings"
      meta="Consent policy · bay assignment · workflow gates"
    >
      <Panel title="Clinical consent policy">
        <ul className="space-y-2 text-[13px] text-[var(--attio-text-secondary)]">
          <li>Commercial consent (counsellor) does not replace procedure-specific nursing consent.</li>
          <li>All required templates must reach <strong>verified</strong> status before session 1.</li>
          <li>IPD paths require witness nurse name on canvas signatures.</li>
          <li>Uploaded scans must be verified by assigned nurse before treatment start.</li>
        </ul>
      </Panel>
      <Panel title="Treatment bays" className="mt-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">
          Physio Bay 1, Physio Bay 2, Procedure Room, Wellness Studio — assign at session start.
        </p>
      </Panel>
    </PageChrome>
  );
}
