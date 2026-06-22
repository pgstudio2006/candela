import type { GstTaxMode } from "@/lib/gst-invoicing";
import type { PaymentScope } from "@/lib/billing-routing";

export type BillingPackageLine = {
  packageId: string;
  label: string;
  amount: number;
  quantity: number;
};

export type PaymentSplit = {
  mode: string;
  amount: number;
};

export type OpdBillingPayload = {
  packageLines: BillingPackageLine[];
  discount: number;
  gstRatePercent: number;
  gstTaxMode: GstTaxMode;
  paymentScope: PaymentScope;
  paymentSplits: PaymentSplit[];
  deferReason?: string;
  skipBilling?: boolean;
};

export function parseOpdBillingPayload(
  data: Record<string, string | number | boolean>,
): OpdBillingPayload {
  let packageLines: BillingPackageLine[] = [];
  let paymentSplits: PaymentSplit[] = [];

  const rawLines = data.packageLines;
  if (typeof rawLines === "string" && rawLines.trim()) {
    try {
      packageLines = JSON.parse(rawLines) as BillingPackageLine[];
    } catch {
      packageLines = [];
    }
  }

  const rawSplits = data.paymentSplits;
  if (typeof rawSplits === "string" && rawSplits.trim()) {
    try {
      paymentSplits = JSON.parse(rawSplits) as PaymentSplit[];
    } catch {
      paymentSplits = [];
    }
  }

  // Legacy single-template billing
  if (!packageLines.length) {
    const amount = Number(data.amount ?? 0);
    const label = String(data.customLine ?? data.template ?? "OPD consultation");
    if (amount > 0 || label) {
      packageLines = [
        {
          packageId: String(data.template ?? "custom"),
          label,
          amount: amount || 0,
          quantity: 1,
        },
      ];
    }
  }

  const paymentScope = (String(data.paymentScope ?? "full") as PaymentScope) || "full";
  if (!paymentSplits.length && paymentScope !== "defer") {
    const mode = String(data.mode ?? "upi");
    const collected =
      paymentScope === "partial"
        ? Number(data.collectedAmount ?? 0)
        : packageLines.reduce((s, l) => s + l.amount * l.quantity, 0) - Number(data.discount ?? 0);
    if (collected > 0) {
      paymentSplits = [{ mode, amount: Math.max(0, collected) }];
    }
  }

  const gstModeRaw = String(data.gstTaxMode ?? "exempt");
  const gstTaxMode: GstTaxMode =
    gstModeRaw === "cgst_sgst" || gstModeRaw === "igst" ? gstModeRaw : "exempt";

  return {
    packageLines,
    discount: Math.max(0, Number(data.discount ?? 0)),
    gstRatePercent: Math.max(0, Math.min(100, Number(data.gstRatePercent ?? 0))),
    gstTaxMode: gstTaxMode === "exempt" && Number(data.gstRatePercent ?? 0) > 0 ? "cgst_sgst" : gstTaxMode,
    paymentScope,
    paymentSplits,
    deferReason: data.deferReason ? String(data.deferReason) : undefined,
    skipBilling: data.skipBilling === true || data.skipBilling === "true",
  };
}

export function billingSubtotal(lines: BillingPackageLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount * line.quantity, 0);
}

export function billingCollectedTotal(payload: OpdBillingPayload, netWithGst: number): number {
  if (payload.paymentScope === "defer" || payload.skipBilling) return 0;
  if (payload.paymentScope === "partial") {
    return Math.min(netWithGst, payload.paymentSplits.reduce((s, p) => s + p.amount, 0));
  }
  return netWithGst;
}

export function primaryPaymentMode(payload: OpdBillingPayload): string {
  if (payload.paymentScope === "defer" || payload.skipBilling) return "defer";
  if (payload.paymentSplits.length === 1) return payload.paymentSplits[0]!.mode;
  if (payload.paymentSplits.length > 1) return "split";
  return "upi";
}
