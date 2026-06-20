"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useState } from "react";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMisPage() {
  const { misReports, runMisReport } = useAdminStore();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "MIS" }]} title="MIS & reports" meta="Scheduled exports · ad-hoc analytics">
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-800">{toast}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {misReports.map((r) => (
          <Panel key={r.id} title={r.label} action={<StatusBadge label={r.schedule} variant="neutral" />}>
            <p className="text-[12px] capitalize text-[var(--attio-text-tertiary)]">{r.category} · {r.format.toUpperCase()}</p>
            <p className="mt-2 text-[11px] text-[var(--attio-text-secondary)]">
              {r.lastRun ? `Last run: ${new Date(r.lastRun).toLocaleString("en-IN")}` : "Never run"}
            </p>
            <AttioButton
              variant="primary"
              className="mt-3 !h-8 !text-[12px]"
              onClick={async () => {
                const { csv, filename } = await runMisReport(r.id);
                downloadCsv(csv, filename);
                showToast(`Downloaded ${filename}`);
              }}
            >
              Run now & download
            </AttioButton>
          </Panel>
        ))}
      </div>
    </PageChrome>
  );
}
