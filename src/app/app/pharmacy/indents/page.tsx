"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";

export default function PharmacyIndentsPage() {
  const { indents, getDrug, fulfillIndent } = usePharmacyStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Indents" }]} title="Ward indents" meta="IPD floor stock requests from nursing">
      <DataTable
        columns={[
          { key: "ward", label: "Ward" },
          { key: "drug", label: "Drug" },
          { key: "req", label: "Requested" },
          { key: "issued", label: "Issued" },
          { key: "nurse", label: "Nurse" },
          { key: "urgency", label: "Urgency" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={indents.map((i) => ({
          ward: `${i.ward}${i.bed ? ` · ${i.bed}` : ""}`,
          drug: getDrug(i.drugId)?.brandName ?? i.drugId,
          req: i.qtyRequested,
          issued: i.qtyIssued,
          nurse: i.nurseName,
          urgency: i.urgency,
          status: <StatusBadge label={i.status} variant="info" />,
          actions:
            i.status === "pending" ? (
              <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => fulfillIndent(i.id, i.qtyRequested)}>
                Issue
              </AttioButton>
            ) : null,
        }))}
      />
    </PageChrome>
  );
}
