export type OpdReceiptLine = {
  label: string;
  quantity: number;
  lineTotal: number;
};

export type OpdReceiptPayload = {
  invoiceNumber: string;
  issuedAt: string;
  patientName: string;
  patientUhid: string;
  patientPhone: string;
  doctorName: string;
  token?: number;
  billingStatus: string;
  paymentScope?: string;
  paymentMode: string;
  lines: OpdReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  routingNote?: string;
};

export function formatReceiptDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
