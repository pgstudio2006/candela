"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";

export default function PharmacyBillingPage() {
  const { bills, getDrug, markBillPaid } = usePharmacyStore();

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
          patient: b.patientName,
          lines: b.lines.map((l) => getDrug(l.drugId)?.brandName ?? l.drugId).join(", "),
          total: `₹${b.total.toLocaleString("en-IN")}`,
          gst: `₹${b.gstTotal.toFixed(0)}`,
          status: <StatusBadge label={b.paid ? "Paid" : "Pending"} variant={b.paid ? "success" : "danger"} />,
          actions: !b.paid ? (
            <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => markBillPaid(b.id, "upi")}>
              Mark paid
            </AttioButton>
          ) : (
            b.paymentMode
          ),
        }))}
      />
      {bills.length === 0 && (
        <p className="mt-4 text-[13px] text-[var(--attio-text-tertiary)]">Bills appear after dispense from Prescriptions queue.</p>
      )}
    </PageChrome>
  );
}
