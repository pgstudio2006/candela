"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function AdminSettingsPage() {
  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Settings" }]} title="Admin settings" meta="Platform configuration · privacy · exports">
      <Panel title="Privacy & data mining">
        <ul className="space-y-2 text-[13px] text-[var(--attio-text-secondary)]">
          <li>Population analytics use k-anonymity ≥ 5</li>
          <li>Geo map shows aggregate clusters only by default</li>
          <li>Audit log retention: 7 years (policy)</li>
        </ul>
      </Panel>
      <Panel title="Integrations (UI phase)" className="mt-4">
        <ul className="space-y-2 text-[13px] text-[var(--attio-text-secondary)]">
          <li>Backend API — ready for Phase D migration off localStorage</li>
          <li>Payroll export — revenue share CSV</li>
          <li>WhatsApp / SMS — consent remote sign (flag only)</li>
        </ul>
      </Panel>
    </PageChrome>
  );
}
