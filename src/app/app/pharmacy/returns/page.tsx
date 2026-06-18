"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";

export default function PharmacyReturnsPage() {
  const { returns, getDrug, approveReturn, restockReturn } = usePharmacyStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Returns" }]} title="Returns" meta="Patient · ward · supplier returns">
      <DataTable
        columns={[
          { key: "type", label: "Type" },
          { key: "drug", label: "Drug" },
          { key: "qty", label: "Qty" },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={returns.map((r) => ({
          type: r.type,
          drug: getDrug(r.drugId)?.brandName ?? r.drugId,
          qty: r.qty,
          reason: r.reason,
          status: <StatusBadge label={r.status} variant="info" />,
          actions: (
            <div className="flex gap-1">
              {r.status === "pending" && (
                <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => approveReturn(r.id)}>
                  Approve
                </AttioButton>
              )}
              {r.status === "approved" && (
                <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => restockReturn(r.id)}>
                  Restock
                </AttioButton>
              )}
            </div>
          ),
        }))}
      />
    </PageChrome>
  );
}
