"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { PharmacyDialog, PharmacyInput, PharmacyTextarea, FormRow } from "@/components/pharmacy/ui";
import type { StockBatch } from "@/design-system/pharmacy-data";
import { daysToExpiry } from "@/lib/pharmacy-platform";
import { useState } from "react";

export default function PharmacyInventoryPage() {
  const { stock, getDrug, quarantineBatch, adjustStock } = usePharmacyStore();
  const [tab, setTab] = useState<"all" | "low" | "expiry">("all");
  const [adjust, setAdjust] = useState<StockBatch | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const rows = stock.filter((s) => {
    const drug = getDrug(s.drugId);
    if (tab === "low") return s.qtyOnHand <= (drug?.reorderLevel ?? 0);
    if (tab === "expiry") {
      const d = daysToExpiry(s.expiry);
      return d >= 0 && d <= 60;
    }
    return true;
  });

  const submitAdjust = async () => {
    if (!adjust) return;
    const d = Number(delta);
    if (!d || !reason.trim()) return;
    setAdjusting(true);
    await adjustStock(adjust.id, d, reason.trim());
    setAdjusting(false);
    setAdjust(null);
    setDelta("");
    setReason("");
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Inventory" }]}
      title="Batch inventory"
      meta="FEFO · reservations · rack locations · quarantine · stock adjustment"
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
              <div className="flex gap-1">
                <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => setAdjust(s)}>
                  Adjust
                </AttioButton>
                <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => void quarantineBatch(s.id, !s.quarantined)}>
                  {s.quarantined ? "Release" : "Quarantine"}
                </AttioButton>
              </div>
            ),
          };
        })}
      />

      {adjust && (
        <PharmacyDialog
          open={!!adjust}
          title="Adjust stock"
          subtitle={`${getDrug(adjust.drugId)?.brandName ?? adjust.drugId} · batch ${adjust.batchNo}`}
          onClose={() => { setAdjust(null); setDelta(""); setReason(""); }}
        >
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--attio-text-secondary)]">Current on hand: <strong>{adjust.qtyOnHand}</strong></p>
            <FormRow label="Quantity change (+/-)" required>
              <PharmacyInput type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. -5 or 10" />
            </FormRow>
            <FormRow label="Reason" required>
              <PharmacyTextarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Breakage, expiry, recount, etc." />
            </FormRow>
            <div className="flex justify-end gap-2">
              <AttioButton variant="secondary" onClick={() => { setAdjust(null); setDelta(""); setReason(""); }}>Cancel</AttioButton>
              <AttioButton variant="primary" disabled={adjusting} onClick={submitAdjust}>
                {adjusting ? "Adjusting..." : "Adjust"}
              </AttioButton>
            </div>
          </div>
        </PharmacyDialog>
      )}
    </PageChrome>
  );
}
