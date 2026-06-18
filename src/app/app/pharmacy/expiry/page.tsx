"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { daysToExpiry } from "@/lib/pharmacy-platform";

export default function PharmacyExpiryPage() {
  const { stock, getDrug, quarantineBatch } = usePharmacyStore();

  const buckets = [
    { id: "7", label: "≤7 days", max: 7 },
    { id: "30", label: "≤30 days", max: 30 },
    { id: "60", label: "≤60 days", max: 60 },
    { id: "expired", label: "Expired", max: -1 },
  ] as const;

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Expiry" }]} title="Expiry management" meta="Quarantine · destruction log · supplier return">
      {buckets.map((b) => {
        const items = stock.filter((s) => {
          const d = daysToExpiry(s.expiry);
          if (b.id === "expired") return d < 0;
          return d >= 0 && d <= b.max;
        });
        if (!items.length) return null;
        return (
          <div key={b.id} className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold">{b.label} ({items.length})</h3>
            <DataTable
              columns={[
                { key: "drug", label: "Drug" },
                { key: "batch", label: "Batch" },
                { key: "expiry", label: "Expiry" },
                { key: "qty", label: "Qty" },
                { key: "status", label: "Status" },
                { key: "actions", label: "" },
              ]}
              rows={items.map((s) => ({
                drug: getDrug(s.drugId)?.brandName,
                batch: s.batchNo,
                expiry: s.expiry,
                qty: s.qtyOnHand,
                status: <StatusBadge label={s.quarantined ? "Quarantine" : "Active"} variant={s.quarantined ? "danger" : "neutral"} />,
                actions: (
                  <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => quarantineBatch(s.id, true)}>
                    Quarantine
                  </AttioButton>
                ),
              }))}
            />
          </div>
        );
      })}
    </PageChrome>
  );
}
