"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { MrdRequest } from "@/design-system/admin-data";

const STATUS_FLOW: MrdRequest["status"][] = ["pending", "identity_verified", "redaction", "released"];

export default function AdminMrdPage() {
  const { mrdRequests, updateMrdStatus } = useAdminStore();

  const advance = (id: string, current: MrdRequest["status"]) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < STATUS_FLOW.length - 1) updateMrdStatus(id, STATUS_FLOW[idx + 1]);
  };

  return (
    <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "MRD" }]} title="Medical Records Department" meta="Release queue · identity · redaction · SLA">
      <ul className="space-y-4">
        {mrdRequests.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--attio-border)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold">{r.patientName}</p>
                <p className="text-[12px] text-[var(--attio-text-tertiary)]">{r.uhid} · {r.requestType.replace("_", " ")}</p>
                <p className="mt-1 text-[12px]">SLA due: {r.slaDue}</p>
              </div>
              <StatusBadge label={r.status.replace("_", " ")} variant={r.status === "released" ? "success" : "warning"} />
            </div>
            <p className="mt-2 text-[12px] text-[var(--attio-text-secondary)]">Documents: {r.documents.join(" · ")}</p>
            <div className="mt-3 flex gap-2">
              {r.status !== "released" && r.status !== "rejected" && (
                <AttioButton variant="primary" className="!h-8 !text-[12px]" onClick={() => advance(r.id, r.status)}>Advance workflow</AttioButton>
              )}
              {r.status === "pending" && (
                <AttioButton variant="secondary" className="!h-8 !text-[12px]" onClick={() => updateMrdStatus(r.id, "rejected")}>Reject</AttioButton>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Panel title="Release checklist" className="mt-4">
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-[var(--attio-text-secondary)]">
          <li>Identity verified against UHID + photo ID</li>
          <li>Clinical consent on file for requested documents</li>
          <li>Redaction applied for third-party requests</li>
          <li>Release logged in audit trail</li>
        </ol>
      </Panel>
    </PageChrome>
  );
}
