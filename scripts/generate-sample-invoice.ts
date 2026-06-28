import { generateInvoicePdf } from "../src/lib/invoice-pdf";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import type { OpdReceiptPayload } from "../src/lib/opd-receipt";

// Override the fetch to read from filesystem
const originalFetch = global.fetch;
global.fetch = async (url: string | Request | URL, init?: RequestInit) => {
  if (typeof url === 'string' && url.startsWith('/templates/')) {
    const filePath = join(__dirname, '..', 'public', url);
    const buffer = readFileSync(filePath);
    return {
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer.buffer),
    } as Response;
  }
  return originalFetch(url, init);
};

const sampleReceipt: OpdReceiptPayload = {
  invoiceNumber: "INV-2024-001",
  issuedAt: new Date().toISOString(),
  patientName: "Rahul Sharma",
  patientUhid: "UHID-2024-12345",
  patientPhone: "+91 98765 43210",
  doctorName: "Dr. Priya Patel",
  token: 15,
  billingStatus: "paid",
  paymentScope: "full",
  paymentMode: "upi",
  lines: [
    {
      label: "Physiotherapy Consultation",
      quantity: 1,
      lineTotal: 1500,
      rate: 1500,
      taxableAmount: 1271.19,
      sacCode: "999312",
      gstRatePercent: 18,
      cgst: 114.41,
      sgst: 114.41,
      igst: 0,
    },
    {
      label: "Manual Therapy Session",
      quantity: 2,
      lineTotal: 2000,
      rate: 1000,
      taxableAmount: 1694.92,
      sacCode: "999312",
      gstRatePercent: 18,
      cgst: 152.54,
      sgst: 152.54,
      igst: 0,
    },
  ],
  subtotal: 2966.11,
  discount: 200,
  discountMode: "amount",
  discountPercent: 0,
  total: 3500,
  amountPaid: 3500,
  balanceDue: 0,
  routingNote: "Patient discharged with home exercise plan",
  gst: {
    gstin: "29AAAAA0000A1Z5",
    legalName: "Navayu Spine & Joint Care Pvt Ltd",
    address: "Sector 44, Gurgaon, Haryana 122003",
    placeOfSupply: "29-Karnataka",
    sacCode: "999312",
    gstRatePercent: 18,
    taxMode: "cgst_sgst",
  },
  cgstTotal: 266.95,
  sgstTotal: 266.95,
  igstTotal: 0,
  taxTotal: 533.90,
  placeOfSupply: "29-Karnataka",
  isTaxInvoice: true,
};

async function main() {
  console.log("Generating sample invoice...");
  try {
    const pdfBytes = await generateInvoicePdf(sampleReceipt);
    writeFileSync("sample-invoice.pdf", Buffer.from(pdfBytes));
    console.log("Sample invoice saved to sample-invoice.pdf");
  } catch (error) {
    console.error("Error generating invoice:", error);
    process.exit(1);
  }
}

main();
