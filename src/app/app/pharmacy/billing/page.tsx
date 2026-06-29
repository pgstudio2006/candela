"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { PharmacyDialog } from "@/components/pharmacy/ui";
import type { PharmacyBill } from "@/design-system/pharmacy-data";
import type { PaymentMode } from "@/design-system/pharmacy-data";
import { useState } from "react";

export default function PharmacyBillingPage() {
  const { bills, getDrug, markBillPaid } = usePharmacyStore();
  const [selected, setSelected] = useState<PharmacyBill | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>("cash");

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Billing" }]}
      title="Counter billing"
      meta="Rx-linked bills · GST · payment collection"
    >
      <DataTable
        columns={[
          { key: "id", label: "Bill #" },
          { key: "patient", label: "Patient" },
          { key: "lines", label: "Items" },
          { key: "total", label: "Total" },
          { key: "gst", label: "GST" },
          { key: "status", label: "Payment" },
          { key: "actions", label: "" },
        ]}
        rows={bills.map((b) => ({
          id: b.id,
          patient: (
            <button type="button" className="text-left hover:underline" onClick={() => setSelected(b)}>
              {b.patientName}
            </button>
          ),
          lines: b.lines.map((l) => getDrug(l.drugId)?.brandName ?? l.drugId).join(", "),
          total: `₹${b.total.toLocaleString("en-IN")}`,
          gst: `₹${b.gstTotal.toFixed(0)}`,
          status: <StatusBadge label={b.paid ? "Paid" : "Pending"} variant={b.paid ? "success" : "danger"} />,
          actions: !b.paid ? (
            <div className="flex items-center gap-1">
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                className="h-7 rounded border px-1 text-[11px]"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit_ipd">Credit IPD</option>
              </select>
              <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => void markBillPaid(b.id, payMode)}>
                Mark paid
              </AttioButton>
            </div>
          ) : (
            b.paymentMode
          ),
        }))}
      />
      {bills.length === 0 && (
        <p className="mt-4 text-[13px] text-[var(--attio-text-tertiary)]">Bills appear after dispense from Prescriptions queue.</p>
      )}

      {selected && (
        <PharmacyDialog
          open={!!selected}
          title={`Bill ${selected.id}`}
          subtitle={`${selected.patientName} · ${selected.uhid ?? "No UHID"}`}
          onClose={() => setSelected(null)}
          width="max-w-xl"
        >
          <div className="space-y-3 text-[13px]">
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">Subtotal</p>
                <p>₹{selected.subtotal.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">GST</p>
                <p>₹{selected.gstTotal.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">Discount</p>
                <p>₹{selected.discount.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">Total</p>
                <p className="font-semibold">₹{selected.total.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <p className="text-[12px] font-medium text-[var(--attio-text-secondary)]">Items</p>
            <ul className="divide-y rounded-lg border">
              {selected.lines.map((l, i) => {
                const drug = getDrug(l.drugId);
                return (
                  <li key={i} className="flex justify-between px-3 py-2">
                    <span>
                      {drug?.brandName ?? l.drugId} × {l.qty}
                    </span>
                    <span>₹{(l.qty * l.rate).toLocaleString("en-IN")}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-[var(--attio-text-tertiary)]">
              Created by {selected.createdBy} · {new Date(selected.createdAt).toLocaleString("en-IN")}
            </p>
            <div className="flex justify-end pt-2">
              <AttioButton variant="secondary" onClick={() => window.print()}>
                Print bill
              </AttioButton>
            </div>
          </div>
        </PharmacyDialog>
      )}
    </PageChrome>
  );
}
