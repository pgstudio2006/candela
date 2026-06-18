"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";

export default function AdminMisPage() {
  const { misReports, runMisReport, logAdminAction } = useAdminStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "MIS" }]} title="MIS & reports" meta="Scheduled exports · ad-hoc analytics">
      <div className="grid gap-3 sm:grid-cols-2">
        {misReports.map((r) => (
          <Panel key={r.id} title={r.label} action={<StatusBadge label={r.schedule} variant="neutral" />}>
            <p className="text-[12px] capitalize text-[var(--attio-text-tertiary)]">{r.category} · {r.format.toUpperCase()}</p>
            <p className="mt-2 text-[11px] text-[var(--attio-text-secondary)]">
              {r.lastRun ? `Last run: ${new Date(r.lastRun).toLocaleString("en-IN")}` : "Never run"}
            </p>
            <AttioButton variant="primary" className="mt-3 !h-8 !text-[12px]" onClick={() => { runMisReport(r.id); logAdminAction(`Ran MIS report: ${r.label}`); }}>
              Run now
            </AttioButton>
          </Panel>
        ))}
      </div>
    </PageChrome>
  );
}
