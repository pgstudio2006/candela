"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { PO_STATUS_LABELS } from "@/design-system/pharmacy-data";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PharmacyPurchaseOrdersPage() {
  const { purchaseOrders, suppliers, drugs, createPO, updatePOStatus, receivePO, isManager, isPurchase } = usePharmacyStore();
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [batch, setBatch] = useState({ batchNo: "", expiry: "", qty: "" });

  if (!isManager() && !isPurchase()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "PO" }]} title="Purchase orders" meta="Purchase team only">
        <p className="text-[13px]">Purchase order access requires purchase or manager role.</p>
      </PageChrome>
    );
  }

  const quickPo = () => {
    const lowDrug = drugs.find((d) => d.id === "dr_amox");
    if (!lowDrug) return;
    createPO("sup_1", [{ drugId: lowDrug.id, qtyOrdered: 50, qtyReceived: 0, rate: 72, gstPercent: 12 }], "Auto from low stock");
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Purchase orders" }]}
      title="Purchase orders"
      meta="Draft → approve → GRN receive → stock update"
      actions={
        <AttioButton variant="primary" onClick={quickPo}>
          Quick PO (Amoxicillin)
        </AttioButton>
      }
    >
      <DataTable
        columns={[
          { key: "id", label: "PO #" },
          { key: "supplier", label: "Supplier" },
          { key: "lines", label: "Lines" },
          { key: "status", label: "Status" },
          { key: "date", label: "Created" },
          { key: "actions", label: "" },
        ]}
        rows={purchaseOrders.map((p) => ({
          id: p.id,
          supplier: suppliers.find((s) => s.id === p.supplierId)?.name ?? p.supplierId,
          lines: p.lines.map((l) => `${drugs.find((d) => d.id === l.drugId)?.brandName} ×${l.qtyOrdered}`).join("; "),
          status: <StatusBadge label={PO_STATUS_LABELS[p.status]} variant="info" />,
          date: new Date(p.createdAt).toLocaleDateString("en-IN"),
          actions: (
            <div className="flex flex-wrap gap-1">
              {p.status === "draft" && (
                <AttioButton variant="ghost" className="!h-7 !text-[11px]" onClick={() => updatePOStatus(p.id, "approved")}>
                  Approve
                </AttioButton>
              )}
              {["approved", "partial"].includes(p.status) && (
                <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => setReceiveId(p.id)}>
                  Receive GRN
                </AttioButton>
              )}
            </div>
          ),
        }))}
      />
      {receiveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-white p-4">
            <h3 className="font-semibold">Goods receipt — {receiveId}</h3>
            <div className="mt-3 space-y-2">
              <Input placeholder="Batch no" value={batch.batchNo} onChange={(e) => setBatch({ ...batch, batchNo: e.target.value })} className="h-9 text-[13px]" />
              <Input type="date" value={batch.expiry} onChange={(e) => setBatch({ ...batch, expiry: e.target.value })} className="h-9 text-[13px]" />
              <Input type="number" placeholder="Qty received" value={batch.qty} onChange={(e) => setBatch({ ...batch, qty: e.target.value })} className="h-9 text-[13px]" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <AttioButton variant="secondary" onClick={() => setReceiveId(null)}>Cancel</AttioButton>
              <AttioButton
                variant="primary"
                onClick={() => {
                  const po = purchaseOrders.find((p) => p.id === receiveId);
                  if (!po || !batch.batchNo || !batch.expiry) return;
                  const drugId = po.lines[0]?.drugId;
                  if (!drugId) return;
                  receivePO(receiveId, { [drugId]: { batchNo: batch.batchNo, expiry: batch.expiry, qty: Number(batch.qty) || po.lines[0].qtyOrdered } });
                  setReceiveId(null);
                  setBatch({ batchNo: "", expiry: "", qty: "" });
                }}
              >
                Confirm GRN
              </AttioButton>
            </div>
          </div>
        </div>
      )}
    </PageChrome>
  );
}
