import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";
import { receiptFromGstBreakdown } from "@/lib/opd-receipt";
import { computeGstInvoice, parseBranchGstSettings, type GstSettings } from "@/lib/gst-invoicing";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";
import { ServerActionError } from "@/server/errors";

export async function upsertVisitInvoice(
  ctx: ServerContext,
  input: {
    visitId: string;
    patientId: string;
    label: string;
    subtotal: number;
    discount: number;
    collected: number;
    mode: string;
    paymentScope: string;
    lines?: { label: string; quantity: number; taxableAmount: number }[];
    paymentSplits?: { mode: string; amount: number }[];
    gstOverride?: Partial<Pick<GstSettings, "gstRatePercent" | "taxMode">>;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  const scope = branchScope(ctx);
  const branch = await tx.branch.findUnique({ where: { id: scope.branchId } });
  const baseGst = parseBranchGstSettings(branch?.meta);
  const gstSettings: GstSettings = {
    ...baseGst,
    gstRatePercent: input.gstOverride?.gstRatePercent ?? baseGst.gstRatePercent,
    taxMode: input.gstOverride?.taxMode ?? baseGst.taxMode,
  };

  const invoiceLines =
    input.lines?.length
      ? input.lines
      : [{ label: input.label, quantity: 1, taxableAmount: input.subtotal }];

  const gstInvoice = computeGstInvoice({
    settings: gstSettings,
    lines: invoiceLines,
    discount: input.discount,
  });

  const net = gstInvoice.grandTotal;
  const balance = Math.max(0, net - input.collected);
  const invoiceId = `inv_${input.visitId}`;
  const invoiceNumber = `NV-${input.visitId.slice(-8).toUpperCase()}`;

  await tx.invoice.upsert({
    where: { visitId: input.visitId },
    create: {
      id: invoiceId,
      ...scope,
      patientId: input.patientId,
      visitId: input.visitId,
      invoiceNumber,
      status: balance > 0 ? "partial" : input.collected > 0 ? "paid" : "pending",
      subtotal: gstInvoice.taxableSubtotal,
      discount: input.discount,
      taxAmount: gstInvoice.taxTotal,
      totalAmount: net,
      amountPaid: input.collected,
      balanceAmount: balance,
      paymentScope: input.paymentScope,
      payload: {
        gst: gstSettings,
        cgstTotal: gstInvoice.cgstTotal,
        sgstTotal: gstInvoice.sgstTotal,
        igstTotal: gstInvoice.igstTotal,
        paymentSplits: input.paymentSplits ?? [],
      },
      lines: {
        create: gstInvoice.lines.map((line, i) => ({
          id: `line_${input.visitId}_${i}`,
          label: line.label,
          category: "opd",
          quantity: line.quantity,
          unitPrice: line.taxableAmount,
          taxPercent: line.gstRatePercent,
          lineTotal: line.lineTotal,
          payload: {
            sacCode: line.sacCode,
            cgst: line.cgst,
            sgst: line.sgst,
            igst: line.igst,
          },
        })),
      },
    },
    update: {
      status: balance > 0 ? "partial" : input.collected > 0 ? "paid" : "pending",
      subtotal: gstInvoice.taxableSubtotal,
      discount: input.discount,
      taxAmount: gstInvoice.taxTotal,
      totalAmount: net,
      amountPaid: input.collected,
      balanceAmount: balance,
      paymentScope: input.paymentScope,
      payload: {
        gst: gstSettings,
        cgstTotal: gstInvoice.cgstTotal,
        sgstTotal: gstInvoice.sgstTotal,
        igstTotal: gstInvoice.igstTotal,
        paymentSplits: input.paymentSplits ?? [],
      },
    },
  });

  const splits =
    input.paymentSplits?.filter((p) => p.amount > 0) ??
    (input.collected > 0 ? [{ mode: input.mode, amount: input.collected }] : []);

  if (splits.length > 0) {
    await tx.payment.deleteMany({ where: { invoiceId } });
    for (const [index, split] of splits.entries()) {
      await tx.payment.create({
        data: {
          id: `pay_${input.visitId}_${Date.now()}_${index}`,
          ...scope,
          invoiceId,
          amount: split.amount,
          mode: split.mode,
          status: "captured",
          referenceNo: `${split.mode.toUpperCase()}-${Date.now()}-${index}`,
          paidAt: new Date(),
        },
      });
    }
  }
}

export async function getVisitReceipt(ctx: ServerContext, visitId: string): Promise<OpdReceiptPayload> {
  const visit = await prisma.opdVisit.findFirst({
    where: { id: visitId, ...branchScope(ctx) },
  });
  if (!visit) {
    throw new ServerActionError("NOT_FOUND", "Visit not found in your branch.");
  }

  const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
  if (!patient) {
    throw new ServerActionError("NOT_FOUND", "Patient not found.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: ctx.branchId } });
  const gstSettings = parseBranchGstSettings(branch?.meta);

  const invoice = await prisma.invoice.findUnique({
    where: { visitId },
    include: {
      lines: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
  });

  const payload = invoice?.payload as Record<string, unknown> | null;
  const discount = Number(invoice?.discount ?? 0);
  const lineInputs =
    invoice?.lines.length
      ? invoice.lines.map((line) => ({
          label: line.label,
          quantity: line.quantity,
          taxableAmount: Number(line.unitPrice),
        }))
      : [
          {
            label: visit.counselPackageLabel ?? "OPD consultation & services",
            quantity: 1,
            taxableAmount: Number(visit.billAmount ?? 0),
          },
        ];

  const gstInvoice = computeGstInvoice({
    settings: gstSettings,
    lines: lineInputs,
    discount,
  });

  const amountPaid = Number(invoice?.amountPaid ?? visit.amountPaid ?? 0);
  const balanceDue = Number(invoice?.balanceAmount ?? visit.balanceDue ?? 0);
  const latestPayment = invoice?.payments[0];

  return receiptFromGstBreakdown(
    {
      invoiceNumber: invoice?.invoiceNumber ?? `NV-${visitId.slice(-8).toUpperCase()}`,
      issuedAt: (invoice?.createdAt ?? visit.updatedAt ?? new Date()).toISOString(),
      patientName: patientDisplayName(patient),
      patientUhid: patient.uhid,
      patientPhone: patient.phone,
      doctorName: visit.doctorName || "Consultant",
      token: visit.token ?? undefined,
      billingStatus: visit.billing ?? "pending",
      paymentScope: invoice?.paymentScope ?? undefined,
      paymentMode: latestPayment?.mode ?? visit.billing ?? "cash",
      discount,
      amountPaid,
      balanceDue,
      routingNote: visit.routingNote ?? undefined,
    },
    gstInvoice,
  );
}
