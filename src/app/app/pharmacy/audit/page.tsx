"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable } from "@/components/frontdesk/ui";

export default function PharmacyAuditPage() {
  const { activities, isManager } = usePharmacyStore();

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Audit" }]} title="Audit trail" meta="Manager only">
        <p className="text-[13px]">Full audit trail available to pharmacy manager.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Audit" }]} title="Audit trail" meta="Verify · dispense · stock · PO · immutable log">
      <DataTable
        columns={[
          { key: "at", label: "Timestamp" },
          { key: "actor", label: "Actor" },
          { key: "type", label: "Type" },
          { key: "summary", label: "Summary" },
          { key: "ref", label: "Ref" },
        ]}
        rows={activities.map((a) => ({
          at: new Date(a.at).toLocaleString("en-IN"),
          actor: a.actor,
          type: a.type,
          summary: a.summary,
          ref: a.refId ?? "—",
        }))}
      />
    </PageChrome>
  );
}
