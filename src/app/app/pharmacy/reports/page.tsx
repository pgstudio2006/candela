"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { MetricStrip, Panel } from "@/components/frontdesk/ui";

export default function PharmacyReportsPage() {
  const { prescriptions, bills, stock, drugs, getDrug } = usePharmacyStore();
  const today = new Date().toISOString().slice(0, 10);
  const dispensedToday = prescriptions.filter((r) => r.dispensedAt?.startsWith(today)).length;
  const revenue = bills.filter((b) => b.paid && b.createdAt.startsWith(today)).reduce((s, b) => s + b.total, 0);
  const stockValue = stock.reduce((s, b) => {
    const d = getDrug(b.drugId);
    return s + b.qtyOnHand * (b.purchaseRate || d?.defaultMrp || 0);
  }, 0);

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Reports" }]} title="Pharmacy reports" meta="Dispensing · sales · stock valuation">
      <MetricStrip
        metrics={[
          { label: "Dispensed today", value: String(dispensedToday), delta: "Fulfillments", trend: "up" },
          { label: "Revenue today", value: `₹${revenue.toLocaleString("en-IN")}`, delta: "Paid bills", trend: "up" },
          { label: "Stock value", value: `₹${(stockValue / 100000).toFixed(2)}L`, delta: "At purchase rate", trend: "neutral" },
          { label: "Active SKUs", value: String(drugs.filter((d) => d.active).length), delta: "Formulary", trend: "neutral" },
        ]}
      />
      <Panel title="Dispensing register (recent)" className="mt-4">
        <ul className="divide-y text-[13px]">
          {prescriptions
            .filter((r) => r.status === "dispensed" || r.status === "partially_dispensed")
            .slice(0, 15)
            .map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>{r.patientName}</span>
                <span className="text-[var(--attio-text-tertiary)]">{r.dispensedAt ? new Date(r.dispensedAt).toLocaleString("en-IN") : "—"}</span>
              </li>
            ))}
        </ul>
      </Panel>
    </PageChrome>
  );
}
