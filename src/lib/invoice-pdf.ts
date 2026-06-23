import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatGstPercent } from "@/lib/gst-invoicing";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";
import { formatReceiptDate } from "@/lib/opd-receipt";

const TEMPLATE_URL = "/templates/navayu-invoice-template.pdf";

/** Coordinates aligned to public/templates/navayu-invoice-template.pdf (A4, origin bottom-left). */
const LAYOUT = {
  marginLeft: 42,
  marginRight: 553,
  /** Template already prints DATE / INVOICE NO labels — values only. */
  dateValue: { x: 402, y: 586 },
  invoiceNoValue: { x: 402, y: 557 },
  /** BILL TO / SHIP TO blocks. */
  billTo: { x: 42, y: 528 },
  billToLine2: { x: 42, y: 514 },
  shipTo: { x: 312, y: 528 },
  shipToLine2: { x: 312, y: 514 },
  tableFirstRowY: 486,
  rowHeight: 13.5,
  maxRows: 14,
  col: {
    idx: 44,
    desc: 62,
    sac: 228,
    qty: 302,
    rate: 350,
    gst: 404,
    amountRight: 550,
  },
  summaryLabelX: 392,
  summaryGapBelowTable: 14,
  summaryMaxY: 185,
  summaryMinY: 139,
  summaryRowHeight: 13,
  totalAmountY: 111,
  footerY: 82,
  tiny: 7,
  small: 8,
  body: 9,
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

export async function generateInvoicePdf(receipt: OpdReceiptPayload): Promise<Uint8Array> {
  const templateBytes = await fetch(TEMPLATE_URL).then((res) => {
    if (!res.ok) throw new Error("Invoice template PDF not found.");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  drawText(page, formatReceiptDate(receipt.issuedAt), LAYOUT.dateValue.x, LAYOUT.dateValue.y, font, LAYOUT.body);
  drawText(page, receipt.invoiceNumber, LAYOUT.invoiceNoValue.x, LAYOUT.invoiceNoValue.y, font, LAYOUT.body);

  drawText(page, receipt.patientName, LAYOUT.billTo.x, LAYOUT.billTo.y, font, LAYOUT.body);
  drawText(
    page,
    `UHID ${receipt.patientUhid} · ${receipt.patientPhone}`,
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
    drawRightText(page, formatInrForPdf(rate), LAYOUT.col.rate + 44, y, font, LAYOUT.tiny);
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

  let summaryY = LAYOUT.tableFirstRowY - rows.length * LAYOUT.rowHeight - LAYOUT.summaryGapBelowTable;
  if (summaryY > LAYOUT.summaryMaxY) summaryY = LAYOUT.summaryMaxY;
  if (summaryY < LAYOUT.summaryMinY) summaryY = LAYOUT.summaryMinY;

  const drawSummaryRow = (label: string, value: string, emphasis = false) => {
    const rowFont = emphasis ? bold : font;
    const size = emphasis ? LAYOUT.body : LAYOUT.small;
    drawText(page, label, LAYOUT.summaryLabelX, summaryY, rowFont, size);
    drawRightText(page, value, LAYOUT.col.amountRight, summaryY, rowFont, size);
    summaryY -= LAYOUT.summaryRowHeight;
  };

  drawSummaryRow("Subtotal", formatInrForPdf(receipt.subtotal));
  if (receipt.discount > 0) {
    drawSummaryRow(discountLabel(receipt), `-${formatInrForPdf(receipt.discount)}`);
  }
  if (receipt.cgstTotal > 0) drawSummaryRow("CGST", formatInrForPdf(receipt.cgstTotal));
  if (receipt.sgstTotal > 0) drawSummaryRow("SGST", formatInrForPdf(receipt.sgstTotal));
  if (receipt.igstTotal > 0) drawSummaryRow("IGST", formatInrForPdf(receipt.igstTotal));

  drawRightText(page, formatInrForPdf(receipt.total), LAYOUT.col.amountRight, LAYOUT.totalAmountY, bold, LAYOUT.body);

  let footerY = LAYOUT.footerY;
  drawText(
    page,
    `Collected ${formatInrForPdf(receipt.amountPaid)} · ${receipt.paymentMode.toUpperCase()} · ${receipt.billingStatus.toUpperCase()}${
      receipt.paymentScope ? ` · ${receipt.paymentScope}` : ""
    }`,
    LAYOUT.marginLeft,
    footerY,
    font,
    LAYOUT.tiny,
  );
  footerY -= 10;

  const taxNote =
    receipt.taxTotal === 0
      ? "GST exempt healthcare service"
      : `Total tax ${formatInrForPdf(receipt.taxTotal)}`;
  drawText(page, taxNote, LAYOUT.marginLeft, footerY, font, LAYOUT.tiny);
  footerY -= 10;

  if (receipt.balanceDue > 0) {
    drawText(page, `Balance due ${formatInrForPdf(receipt.balanceDue)}`, LAYOUT.marginLeft, footerY, bold, LAYOUT.tiny);
    footerY -= 10;
  }

  if (receipt.routingNote) {
    drawText(page, truncate(receipt.routingNote, 95), LAYOUT.marginLeft, footerY, font, LAYOUT.tiny);
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
