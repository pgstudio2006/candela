import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatGstPercent } from "@/lib/gst-invoicing";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";

const TEMPLATE_URL = "/templates/navayu-invoice-template.pdf";

/** Coordinates aligned to public/templates/navayu-invoice-template.pdf (A4, origin bottom-left). */
const LAYOUT = {
  marginLeft: 42,
  /** Template prints DATE / DUE DATE / INVOICE NO labels — values only in each slot. */
  meta: {
    date: { x: 398, y: 591 },
    dueDate: { x: 398, y: 575 },
    invoiceNo: { x: 398, y: 559 },
  },
  billTo: { x: 42, y: 518 },
  billToLine2: { x: 42, y: 504 },
  shipTo: { x: 318, y: 518 },
  shipToLine2: { x: 318, y: 504 },
  tableFirstRowY: 487,
  rowHeight: 13.5,
  maxRows: 14,
  col: {
    idx: 46,
    desc: 70,
    sac: 230,
    qty: 296,
    rate: 335,
    gst: 402,
    amountRight: 552,
  },
  summaryLabelX: 392,
  summaryRowHeight: 13,
  totalAmountY: 106,
  /** Gap between bottom summary row and the TOTAL box amount line. */
  summaryAboveTotalGap: 26,
  tiny: 7,
  small: 8,
  body: 9,
} as const;

/** Standard PDF fonts only support WinAnsi — strip/replace Unicode (e.g. ₹). */
function pdfSafeText(text: string): string {
  return String(text)
    .replace(/₹/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00B7/g, "|")
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

function formatInvoiceMeta(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function lineRate(line: OpdReceiptPayload["lines"][number]): number {
  if (line.rate != null) return line.rate;
  if (line.taxableAmount != null && line.quantity > 0) return line.taxableAmount;
  return line.lineTotal - (line.cgst ?? 0) - (line.sgst ?? 0) - (line.igst ?? 0);
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number = LAYOUT.body) {
  page.drawText(pdfSafeText(text), { x, y, size, font, color: rgb(0.12, 0.12, 0.14) });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number = LAYOUT.body,
) {
  const safe = pdfSafeText(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - width, y, size, font, color: rgb(0.12, 0.12, 0.14) });
}

function truncate(text: string, max = 30): string {
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

function summaryRows(receipt: OpdReceiptPayload): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (receipt.discount > 0) {
    rows.push({ label: "Subtotal", value: formatInrForPdf(receipt.subtotal) });
    rows.push({ label: discountLabel(receipt), value: `-${formatInrForPdf(receipt.discount)}` });
  }
  if (receipt.cgstTotal > 0) rows.push({ label: "CGST", value: formatInrForPdf(receipt.cgstTotal) });
  if (receipt.sgstTotal > 0) rows.push({ label: "SGST", value: formatInrForPdf(receipt.sgstTotal) });
  if (receipt.igstTotal > 0) rows.push({ label: "IGST", value: formatInrForPdf(receipt.igstTotal) });
  return rows;
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

  const meta = formatInvoiceMeta(receipt.issuedAt);
  drawText(page, meta.date, LAYOUT.meta.date.x, LAYOUT.meta.date.y, font, LAYOUT.body);
  drawText(
    page,
    `${meta.time} | ${receipt.billingStatus.toUpperCase()} | ${receipt.paymentMode.toUpperCase()}`,
    LAYOUT.meta.dueDate.x,
    LAYOUT.meta.dueDate.y,
    font,
    LAYOUT.small,
  );
  drawText(page, receipt.invoiceNumber, LAYOUT.meta.invoiceNo.x, LAYOUT.meta.invoiceNo.y, font, LAYOUT.body);

  drawText(page, receipt.patientName, LAYOUT.billTo.x, LAYOUT.billTo.y, font, LAYOUT.body);
  drawText(
    page,
    `UHID ${receipt.patientUhid} | ${receipt.patientPhone}`,
    LAYOUT.billToLine2.x,
    LAYOUT.billToLine2.y,
    font,
    LAYOUT.small,
  );

  drawText(page, receipt.doctorName, LAYOUT.shipTo.x, LAYOUT.shipTo.y, font, LAYOUT.body);
  drawText(
    page,
    receipt.token != null ? `Token #${receipt.token}` : "Walk-in",
    LAYOUT.shipToLine2.x,
    LAYOUT.shipToLine2.y,
    font,
    LAYOUT.small,
  );

  const rows = receipt.lines.slice(0, LAYOUT.maxRows);
  rows.forEach((line, index) => {
    const y = LAYOUT.tableFirstRowY - index * LAYOUT.rowHeight;
    const rate = lineRate(line);
    drawText(page, String(index + 1), LAYOUT.col.idx, y, font, LAYOUT.small);
    drawText(page, truncate(line.label), LAYOUT.col.desc, y, font, LAYOUT.small);
    drawText(page, line.sacCode ?? receipt.gst.sacCode, LAYOUT.col.sac, y, font, LAYOUT.tiny);
    drawText(page, String(line.quantity), LAYOUT.col.qty, y, font, LAYOUT.small);
    drawText(page, formatInrForPdf(rate), LAYOUT.col.rate, y, font, LAYOUT.tiny);
    drawText(page, formatGstPercent(line.gstRatePercent ?? 0), LAYOUT.col.gst, y, font, LAYOUT.tiny);
    drawRightText(page, formatInrForPdf(line.lineTotal), LAYOUT.col.amountRight, y, font, LAYOUT.small);
  });

  if (receipt.lines.length > LAYOUT.maxRows) {
    const y = LAYOUT.tableFirstRowY - rows.length * LAYOUT.rowHeight;
    drawText(
      page,
      `+ ${receipt.lines.length - LAYOUT.maxRows} more line(s)`,
      LAYOUT.col.desc,
      y,
      font,
      LAYOUT.tiny,
    );
  }

  const stack = summaryRows(receipt);
  let summaryY =
    LAYOUT.totalAmountY + LAYOUT.summaryAboveTotalGap + (stack.length - 1) * LAYOUT.summaryRowHeight;
  for (const row of stack) {
    drawText(page, row.label, LAYOUT.summaryLabelX, summaryY, font, LAYOUT.small);
    drawRightText(page, row.value, LAYOUT.col.amountRight, summaryY, font, LAYOUT.small);
    summaryY -= LAYOUT.summaryRowHeight;
  }

  drawRightText(page, formatInrForPdf(receipt.total), LAYOUT.col.amountRight, LAYOUT.totalAmountY, bold, LAYOUT.body);

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
