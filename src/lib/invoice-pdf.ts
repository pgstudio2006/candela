import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatGstPercent } from "@/lib/gst-invoicing";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";
import { formatReceiptDate } from "@/lib/opd-receipt";

const TEMPLATE_URL = "/templates/navayu-invoice-template.pdf";

const LAYOUT = {
  marginLeft: 42,
  marginRight: 553,
  metaY: 578,
  patientY: 558,
  contactY: 542,
  gstBlockY: 524,
  tableHeaderY: 508,
  tableRowStartY: 494,
  rowHeight: 13,
  maxRows: 12,
  totalsY: 168,
  tiny: 7,
  small: 8,
  body: 9,
  heading: 9,
} as const;

/** Standard PDF fonts only support WinAnsi — strip/replace Unicode (e.g. ₹). */
function pdfSafeText(text: string): string {
  return String(text)
    .replace(/₹/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\t\n\r\u0020-\u00FF]/g, "");
}

function formatInrForPdf(amount: number): string {
  const value = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs.${value}`;
}

function lineTaxableAmount(line: OpdReceiptPayload["lines"][number]): number {
  if (line.taxableAmount != null) return line.taxableAmount;
  return line.lineTotal - (line.cgst ?? 0) - (line.sgst ?? 0) - (line.igst ?? 0);
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number = LAYOUT.body) {
  page.drawText(pdfSafeText(text), { x, y, size, font, color: rgb(0.12, 0.12, 0.14) });
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  bold: PDFFont,
) {
  const labelText = pdfSafeText(`${label}: `);
  drawText(page, labelText, x, y, bold, LAYOUT.body);
  const labelWidth = bold.widthOfTextAtSize(labelText, LAYOUT.body);
  drawText(page, value, x + labelWidth, y, font, LAYOUT.body);
}

function truncate(text: string, max = 28): string {
  const trimmed = pdfSafeText(text).trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}...`;
}

function discountLabel(receipt: OpdReceiptPayload): string {
  if (receipt.discountMode === "percent" && receipt.discountPercent != null && receipt.discountPercent > 0) {
    return `Discount (${receipt.discountPercent}%)`;
  }
  return "Discount";
}

export async function generateInvoicePdf(receipt: OpdReceiptPayload): Promise<Uint8Array> {
  const templateBytes = await fetch(TEMPLATE_URL).then((res) => {
    if (!res.ok) throw new Error("Invoice template PDF not found.");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  drawLabelValue(page, "Invoice No", receipt.invoiceNumber, LAYOUT.marginLeft, LAYOUT.metaY, font, bold);
  drawLabelValue(page, "Date", formatReceiptDate(receipt.issuedAt), 360, LAYOUT.metaY, font, bold);

  drawLabelValue(page, "Patient", receipt.patientName, LAYOUT.marginLeft, LAYOUT.patientY, font, bold);
  drawLabelValue(page, "UHID", receipt.patientUhid, 300, LAYOUT.patientY, font, bold);
  drawLabelValue(page, "Mobile", receipt.patientPhone, LAYOUT.marginLeft, LAYOUT.contactY, font, bold);
  drawLabelValue(page, "Doctor", receipt.doctorName, 300, LAYOUT.contactY, font, bold);
  drawLabelValue(
    page,
    "Token",
    receipt.token != null ? `#${receipt.token}` : "-",
    460,
    LAYOUT.contactY,
    font,
    bold,
  );

  if (receipt.gst.gstin) {
    drawText(page, `GSTIN: ${receipt.gst.gstin}`, LAYOUT.marginLeft, LAYOUT.gstBlockY, font, LAYOUT.tiny);
    drawText(
      page,
      truncate(receipt.gst.legalName, 60),
      LAYOUT.marginLeft,
      LAYOUT.gstBlockY - 10,
      font,
      LAYOUT.tiny,
    );
    drawText(
      page,
      `Place of supply: ${receipt.placeOfSupply || receipt.gst.placeOfSupply}`,
      300,
      LAYOUT.gstBlockY - 10,
      font,
      LAYOUT.tiny,
    );
  }

  const colX = {
    idx: LAYOUT.marginLeft,
    desc: LAYOUT.marginLeft + 14,
    sac: 248,
    qty: 292,
    taxable: 318,
    gst: 392,
    amount: LAYOUT.marginRight - 62,
  };

  drawText(page, "#", colX.idx, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "Description", colX.desc, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "SAC", colX.sac, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "Qty", colX.qty, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "Taxable", colX.taxable, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "GST", colX.gst, LAYOUT.tableHeaderY, bold, LAYOUT.heading);
  drawText(page, "Amount", colX.amount, LAYOUT.tableHeaderY, bold, LAYOUT.heading);

  page.drawLine({
    start: { x: LAYOUT.marginLeft, y: LAYOUT.tableHeaderY - 3 },
    end: { x: LAYOUT.marginRight, y: LAYOUT.tableHeaderY - 3 },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.78),
  });

  const rows = receipt.lines.slice(0, LAYOUT.maxRows);
  rows.forEach((line, index) => {
    const y = LAYOUT.tableRowStartY - index * LAYOUT.rowHeight;
    const taxable = lineTaxableAmount(line);
    drawText(page, String(index + 1), colX.idx, y, font, LAYOUT.small);
    drawText(page, truncate(line.label, 26), colX.desc, y, font, LAYOUT.small);
    drawText(page, line.sacCode ?? receipt.gst.sacCode, colX.sac, y, font, LAYOUT.tiny);
    drawText(page, String(line.quantity), colX.qty, y, font, LAYOUT.small);
    drawText(page, formatInrForPdf(taxable), colX.taxable, y, font, LAYOUT.tiny);
    drawText(page, formatGstPercent(line.gstRatePercent ?? 0), colX.gst, y, font, LAYOUT.tiny);
    drawText(page, formatInrForPdf(line.lineTotal), colX.amount, y, font, LAYOUT.small);
  });

  if (receipt.lines.length > LAYOUT.maxRows) {
    const y = LAYOUT.tableRowStartY - rows.length * LAYOUT.rowHeight;
    drawText(
      page,
      `+ ${receipt.lines.length - LAYOUT.maxRows} more line(s)`,
      colX.desc,
      y,
      font,
      LAYOUT.tiny,
    );
  }

  let totalsY = LAYOUT.totalsY;
  const drawTotalRow = (label: string, value: string, emphasis = false) => {
    drawText(page, label, 340, totalsY, emphasis ? bold : font, emphasis ? LAYOUT.body : LAYOUT.small);
    drawText(page, value, colX.amount, totalsY, emphasis ? bold : font, emphasis ? LAYOUT.body : LAYOUT.small);
    totalsY -= 13;
  };

  drawTotalRow("Subtotal", formatInrForPdf(receipt.subtotal));
  if (receipt.discount > 0) {
    drawTotalRow(discountLabel(receipt), `-${formatInrForPdf(receipt.discount)}`);
  }
  if (receipt.cgstTotal > 0) drawTotalRow("CGST", formatInrForPdf(receipt.cgstTotal));
  if (receipt.sgstTotal > 0) drawTotalRow("SGST", formatInrForPdf(receipt.sgstTotal));
  if (receipt.igstTotal > 0) drawTotalRow("IGST", formatInrForPdf(receipt.igstTotal));
  drawTotalRow("Grand total", formatInrForPdf(receipt.total), true);
  drawTotalRow("Collected", formatInrForPdf(receipt.amountPaid));
  if (receipt.balanceDue > 0) drawTotalRow("Balance due", formatInrForPdf(receipt.balanceDue), true);

  const statusLine = `Payment: ${receipt.paymentMode.toUpperCase()} · Status: ${receipt.billingStatus.toUpperCase()}${
    receipt.paymentScope ? ` · ${receipt.paymentScope}` : ""
  }`;
  drawText(page, statusLine, LAYOUT.marginLeft, totalsY - 2, font, LAYOUT.tiny);

  const taxNote =
    receipt.taxTotal === 0
      ? "GST exempt healthcare service"
      : `Total tax ${formatInrForPdf(receipt.taxTotal)}`;
  drawText(page, taxNote, LAYOUT.marginLeft, totalsY - 12, font, LAYOUT.tiny);

  if (receipt.routingNote) {
    drawText(page, truncate(receipt.routingNote, 90), LAYOUT.marginLeft, totalsY - 22, font, LAYOUT.tiny);
  }

  return pdfDoc.save();
}

export function printPdfBytes(bytes: Uint8Array, title = "Invoice") {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.title = title;
  iframe.src = url;
  const cleanup = () => {
    URL.revokeObjectURL(url);
    iframe.remove();
  };
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(cleanup, 60_000);
    }
  };
  document.body.appendChild(iframe);
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
