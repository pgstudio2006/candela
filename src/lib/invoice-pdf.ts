import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatGstPercent } from "@/lib/gst-invoicing";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";

const TEMPLATE_URL = "/templates/navayu-invoice-template.pdf";

const COLORS = {
  ink: rgb(0.12, 0.12, 0.14),
  border: rgb(0.72, 0.72, 0.76),
  headerFill: rgb(0.95, 0.96, 0.98),
  white: rgb(1, 1, 1),
} as const;

const FONT = {
  caption: 9,
  body: 10,
  table: 10,
  tableHead: 10,
  emphasis: 11,
} as const;

/** Coordinates aligned to public/templates/navayu-invoice-template.pdf (A4, origin bottom-left). */
const LAYOUT = {
  marginLeft: 42,
  marginRight: 553,
  meta: {
    date: { x: 398, y: 591 },
    dueDate: { x: 398, y: 575 },
    invoiceNo: { x: 398, y: 559 },
  },
  billTo: { x: 42, y: 518 },
  billToLine2: { x: 42, y: 503 },
  shipTo: { x: 318, y: 518 },
  shipToLine2: { x: 318, y: 503 },
  gstLine: { x: 42, y: 493 },
  tableTop: 502,
  tableLeft: 42,
  tableRight: 553,
  rowHeight: 17,
  headerHeight: 18,
  maxLineRows: 12,
  /** Keep table bottom above template footer art. */
  tableMinBottom: 138,
  colRight: [64, 196, 244, 272, 332, 378, 553],
} as const;

const TABLE_HEADERS = ["#", "Description", "SAC", "Qty", "Taxable", "GST", "Amount"] as const;

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

function lineTaxable(line: OpdReceiptPayload["lines"][number]): number {
  if (line.taxableAmount != null) return line.taxableAmount;
  return line.lineTotal - (line.cgst ?? 0) - (line.sgst ?? 0) - (line.igst ?? 0);
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number = FONT.body) {
  page.drawText(pdfSafeText(text), { x, y, size, font, color: COLORS.ink });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number = FONT.body,
  padding = 4,
) {
  const safe = pdfSafeText(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - width - padding, y, size, font, color: COLORS.ink });
}

function truncate(text: string, max = 34): string {
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

function footerRows(receipt: OpdReceiptPayload): Array<{ label: string; value: string; emphasis?: boolean }> {
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: "Subtotal", value: formatInrForPdf(receipt.subtotal) },
  ];
  if (receipt.discount > 0) {
    rows.push({ label: discountLabel(receipt), value: `-${formatInrForPdf(receipt.discount)}` });
  }
  if (receipt.cgstTotal > 0) rows.push({ label: "CGST", value: formatInrForPdf(receipt.cgstTotal) });
  if (receipt.sgstTotal > 0) rows.push({ label: "SGST", value: formatInrForPdf(receipt.sgstTotal) });
  if (receipt.igstTotal > 0) rows.push({ label: "IGST", value: formatInrForPdf(receipt.igstTotal) });
  rows.push({ label: "Grand total", value: formatInrForPdf(receipt.total), emphasis: true });
  rows.push({ label: "Collected", value: formatInrForPdf(receipt.amountPaid) });
  if (receipt.balanceDue > 0) {
    rows.push({ label: "Balance due", value: formatInrForPdf(receipt.balanceDue), emphasis: true });
  }
  return rows;
}

function cellBaseline(rowTop: number, rowHeight: number): number {
  return rowTop - rowHeight + 5;
}

function drawHLine(page: PDFPage, x1: number, x2: number, y: number) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.6, color: COLORS.border });
}

function drawVLines(page: PDFPage, yTop: number, yBottom: number) {
  for (const x of LAYOUT.colRight.slice(0, -1)) {
    page.drawLine({
      start: { x, y: yTop },
      end: { x, y: yBottom },
      thickness: 0.5,
      color: COLORS.border,
    });
  }
}

function drawTable(
  page: PDFPage,
  receipt: OpdReceiptPayload,
  font: PDFFont,
  bold: PDFFont,
) {
  const lineRows = receipt.lines.slice(0, LAYOUT.maxLineRows);
  const totals = footerRows(receipt);
  const tableHeight =
    LAYOUT.headerHeight + lineRows.length * LAYOUT.rowHeight + totals.length * LAYOUT.rowHeight;
  const tableBottom = Math.max(LAYOUT.tableTop - tableHeight, LAYOUT.tableMinBottom);
  const tableTop = tableBottom + tableHeight;
  const width = LAYOUT.tableRight - LAYOUT.tableLeft;

  page.drawRectangle({
    x: LAYOUT.tableLeft - 2,
    y: tableBottom - 2,
    width: width + 4,
    height: tableTop - tableBottom + 24,
    color: COLORS.white,
  });

  page.drawRectangle({
    x: LAYOUT.tableLeft,
    y: tableBottom,
    width,
    height: tableHeight,
    borderWidth: 0.8,
    borderColor: COLORS.border,
    color: COLORS.white,
  });

  page.drawRectangle({
    x: LAYOUT.tableLeft,
    y: tableTop - LAYOUT.headerHeight,
    width,
    height: LAYOUT.headerHeight,
    color: COLORS.headerFill,
  });

  drawHLine(page, LAYOUT.tableLeft, LAYOUT.tableRight, tableTop);
  drawHLine(page, LAYOUT.tableLeft, LAYOUT.tableRight, tableTop - LAYOUT.headerHeight);

  const headerY = cellBaseline(tableTop, LAYOUT.headerHeight);
  TABLE_HEADERS.forEach((label, i) => {
    if (label === "Amount") {
      drawRightText(page, label, LAYOUT.colRight[6], headerY, bold, FONT.tableHead);
    } else {
      drawText(page, label, (i === 0 ? LAYOUT.tableLeft : LAYOUT.colRight[i - 1]) + 4, headerY, bold, FONT.tableHead);
    }
  });

  let rowTop = tableTop - LAYOUT.headerHeight;
  lineRows.forEach((line, index) => {
    rowTop -= LAYOUT.rowHeight;
    drawHLine(page, LAYOUT.tableLeft, LAYOUT.tableRight, rowTop);
    const y = cellBaseline(rowTop + LAYOUT.rowHeight, LAYOUT.rowHeight);
    const taxable = lineTaxable(line);
    drawText(page, String(index + 1), LAYOUT.tableLeft + 4, y, font, FONT.table);
    drawText(page, truncate(line.label), LAYOUT.colRight[0] + 4, y, font, FONT.table);
    drawText(page, line.sacCode ?? receipt.gst.sacCode, LAYOUT.colRight[1] + 4, y, font, FONT.caption);
    drawText(page, String(line.quantity), LAYOUT.colRight[2] + 4, y, font, FONT.table);
    drawRightText(page, formatInrForPdf(taxable), LAYOUT.colRight[4], y, font, FONT.table);
    drawText(page, formatGstPercent(line.gstRatePercent ?? 0), LAYOUT.colRight[4] + 4, y, font, FONT.caption);
    drawRightText(page, formatInrForPdf(line.lineTotal), LAYOUT.colRight[6], y, font, FONT.table);
  });

  if (receipt.lines.length > LAYOUT.maxLineRows) {
    rowTop -= LAYOUT.rowHeight;
    drawHLine(page, LAYOUT.tableLeft, LAYOUT.tableRight, rowTop);
    const y = cellBaseline(rowTop + LAYOUT.rowHeight, LAYOUT.rowHeight);
    drawText(
      page,
      `+ ${receipt.lines.length - LAYOUT.maxLineRows} more line(s)`,
      LAYOUT.colRight[0] + 4,
      y,
      font,
      FONT.caption,
    );
  }

  drawVLines(page, tableTop, tableBottom);

  totals.forEach((row) => {
    rowTop -= LAYOUT.rowHeight;
    drawHLine(page, LAYOUT.tableLeft, LAYOUT.tableRight, rowTop);
    const y = cellBaseline(rowTop + LAYOUT.rowHeight, LAYOUT.rowHeight);
    const rowFont = row.emphasis ? bold : font;
    const size = row.emphasis ? FONT.emphasis : FONT.table;
    drawText(page, row.label, LAYOUT.colRight[0] + 4, y, rowFont, size);
    drawRightText(page, row.value, LAYOUT.colRight[6], y, rowFont, size);
  });

  const noteY = tableBottom - 14;
  const taxNote =
    receipt.taxTotal === 0
      ? "GST exempt healthcare service"
      : `Total tax ${formatInrForPdf(receipt.taxTotal)}`;
  const statusNote = `Status: ${receipt.billingStatus.toUpperCase()}${
    receipt.paymentScope ? ` | ${receipt.paymentScope} payment` : ""
  } | ${taxNote}`;
  drawText(page, statusNote, LAYOUT.tableLeft, noteY, font, FONT.caption);

  if (receipt.routingNote) {
    drawText(page, truncate(receipt.routingNote, 100), LAYOUT.tableLeft, noteY - 11, font, FONT.caption);
  }
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
  drawText(page, meta.date, LAYOUT.meta.date.x, LAYOUT.meta.date.y, font, FONT.body);
  drawText(
    page,
    `${meta.time} | ${receipt.billingStatus.toUpperCase()} | ${receipt.paymentMode.toUpperCase()}`,
    LAYOUT.meta.dueDate.x,
    LAYOUT.meta.dueDate.y,
    font,
    FONT.caption,
  );
  drawText(page, receipt.invoiceNumber, LAYOUT.meta.invoiceNo.x, LAYOUT.meta.invoiceNo.y, font, FONT.body);

  drawText(page, receipt.patientName, LAYOUT.billTo.x, LAYOUT.billTo.y, bold, FONT.body);
  drawText(
    page,
    `UHID ${receipt.patientUhid} | ${receipt.patientPhone}`,
    LAYOUT.billToLine2.x,
    LAYOUT.billToLine2.y,
    font,
    FONT.caption,
  );

  drawText(page, receipt.doctorName, LAYOUT.shipTo.x, LAYOUT.shipTo.y, bold, FONT.body);
  drawText(
    page,
    receipt.token != null ? `Token #${receipt.token}` : "Walk-in",
    LAYOUT.shipToLine2.x,
    LAYOUT.shipToLine2.y,
    font,
    FONT.caption,
  );

  if (receipt.gst.gstin) {
    drawText(
      page,
      `GSTIN: ${receipt.gst.gstin} | Place of supply: ${receipt.placeOfSupply || receipt.gst.placeOfSupply}`,
      LAYOUT.gstLine.x,
      LAYOUT.gstLine.y,
      font,
      FONT.caption,
    );
  }

  drawTable(page, receipt, font, bold);

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
