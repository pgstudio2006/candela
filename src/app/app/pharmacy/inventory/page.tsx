"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { daysToExpiry } from "@/lib/pharmacy-platform";
import { useState } from "react";

export default function PharmacyInventoryPage() {
  const { stock, getDrug, quarantineBatch } = usePharmacyStore();
  const [tab, setTab] = useState<"all" | "low" | "expiry">("all");

  const rows = stock.filter((s) => {
    const drug = getDrug(s.drugId);
    if (tab === "low") return s.qtyOnHand <= (drug?.reorderLevel ?? 0);
    if (tab === "expiry") {
      const d = daysToExpiry(s.expiry);
      return d >= 0 && d <= 60;
    }
    return true;
  });

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Inventory" }]}
      title="Batch inventory"
      meta="FEFO · reservations · rack locations · quarantine"
      tabs={[
        { id: "all", label: "All batches" },
        { id: "low", label: "Low stock" },
        { id: "expiry", label: "Near expiry" },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
    >
      <DataTable
        columns={[
          { key: "drug", label: "Drug" },
          { key: "batch", label: "Batch" },
          { key: "expiry", label: "Expiry" },
          { key: "onHand", label: "On hand" },
          { key: "reserved", label: "Reserved" },
          { key: "rack", label: "Rack" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={rows.map((s) => {
          const drug = getDrug(s.drugId);
          const d = daysToExpiry(s.expiry);
          return {
            drug: `${drug?.brandName ?? s.drugId} ${drug?.strength ?? ""}`,
            batch: s.batchNo,
            expiry: `${s.expiry} (${d}d)`,
            onHand: s.qtyOnHand,
            reserved: s.reserved,
            rack: s.rack,
            status: s.quarantined ? <StatusBadge label="Quarantine" variant="danger" /> : <StatusBadge label="Active" variant="success" />,
            actions: (
              <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => void quarantineBatch(s.id, !s.quarantined)}>
                {s.quarantined ? "Release" : "Quarantine"}
              </AttioButton>
            ),
          };
        })}
      />
    </PageChrome>
  );
}
