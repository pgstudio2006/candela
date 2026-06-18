import type {
  Drug,
  PharmacyBill,
  Prescription,
  PurchaseOrder,
  ScheduleHEntry,
  StockBatch,
} from "@/design-system/pharmacy-data";

export type PharmacyKpis = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
}[];

export function daysToExpiry(expiry: string): number {
  return Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
}

export function pickFefoBatch(drugId: string, stock: StockBatch[], qty: number): StockBatch | null {
  const batches = stock
    .filter((s) => s.drugId === drugId && !s.quarantined && s.qtyOnHand - s.reserved >= qty)
    .sort((a, b) => a.expiry.localeCompare(b.expiry));
  return batches[0] ?? null;
}

export function computePharmacyKpis(
  prescriptions: Prescription[],
  stock: StockBatch[],
  drugs: Drug[],
  bills: PharmacyBill[],
  purchaseOrders: PurchaseOrder[],
): PharmacyKpis {
  const today = new Date().toISOString().slice(0, 10);
  const pending = prescriptions.filter((r) => r.status === "pending").length;
  const verified = prescriptions.filter((r) => r.status === "verified").length;
  const dispensedToday = prescriptions.filter(
    (r) => r.status === "dispensed" && r.dispensedAt?.startsWith(today),
  ).length;
  const lowStock = drugs.filter((d) => {
    const onHand = stock.filter((s) => s.drugId === d.id && !s.quarantined).reduce((n, s) => n + s.qtyOnHand, 0);
    return onHand <= d.reorderLevel;
  }).length;
  const nearExpiry = stock.filter((s) => {
    const d = daysToExpiry(s.expiry);
    return d >= 0 && d <= 30 && !s.quarantined;
  }).length;
  const revenueToday = bills
    .filter((b) => b.createdAt.startsWith(today) && b.paid)
    .reduce((s, b) => s + b.total, 0);
  const openPo = purchaseOrders.filter((p) => ["submitted", "approved", "partial"].includes(p.status)).length;

  return [
    { label: "Pending verify", value: String(pending), delta: "Awaiting pharmacist", trend: pending ? "down" : "neutral" },
    { label: "Ready to dispense", value: String(verified), delta: "Verified queue", trend: "neutral" },
    { label: "Dispensed today", value: String(dispensedToday), delta: "Fulfillment", trend: "up" },
    { label: "Counter revenue", value: `₹${revenueToday.toLocaleString("en-IN")}`, delta: "Today", trend: "up" },
    { label: "Low stock SKUs", value: String(lowStock), delta: "At/below reorder", trend: lowStock ? "down" : "neutral" },
    { label: "Near expiry", value: String(nearExpiry), delta: "≤30 days", trend: nearExpiry ? "down" : "neutral" },
    { label: "Open POs", value: String(openPo), delta: "Procurement", trend: "neutral" },
  ];
}

export function isControlledSchedule(schedule: Drug["schedule"]): boolean {
  return schedule === "H" || schedule === "H1" || schedule === "X";
}

export function computeScheduleBalance(entries: ScheduleHEntry[], drugId: string): number {
  return entries.filter((e) => e.drugId === drugId).reduce((_, e) => e.balanceAfter, 0) || 0;
}

export function calcBillTotals(lines: { qty: number; rate: number; gstPercent: number }[], discount = 0) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const gstTotal = lines.reduce((s, l) => s + (l.qty * l.rate * l.gstPercent) / 100, 0);
  const total = subtotal + gstTotal - discount;
  return { subtotal, gstTotal, total };
}
