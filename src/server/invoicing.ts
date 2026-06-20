import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";
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
  },
  tx: Prisma.TransactionClient = prisma,
) {
  const scope = branchScope(ctx);
  const net = Math.max(0, input.subtotal - input.discount);
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
      subtotal: net,
      discount: input.discount,
      totalAmount: net,
      amountPaid: input.collected,
      balanceAmount: balance,
      paymentScope: input.paymentScope,
      lines: {
        create: {
          id: `line_${input.visitId}`,
          label: input.label,
          category: "opd",
          quantity: 1,
          unitPrice: net,
          lineTotal: net,
        },
      },
    },
    update: {
      status: balance > 0 ? "partial" : input.collected > 0 ? "paid" : "pending",
      subtotal: net,
      discount: input.discount,
      totalAmount: net,
      amountPaid: input.collected,
      balanceAmount: balance,
      paymentScope: input.paymentScope,
    },
  });

  if (input.collected > 0) {
    const paymentId = `pay_${input.visitId}_${Date.now()}`;
    await tx.payment.create({
      data: {
        id: paymentId,
        ...scope,
        invoiceId,
        amount: input.collected,
        mode: input.mode,
        status: "captured",
        referenceNo: `${input.mode.toUpperCase()}-${Date.now()}`,
        paidAt: new Date(),
      },
    });
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

  const invoice = await prisma.invoice.findUnique({
    where: { visitId },
    include: {
      lines: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
  });

  const lines =
    invoice?.lines.length
      ? invoice.lines.map((line) => ({
          label: line.label,
          quantity: line.quantity,
          lineTotal: Number(line.lineTotal),
        }))
      : [
          {
            label: visit.counselPackageLabel ?? "OPD services",
            quantity: 1,
            lineTotal: Number(visit.billAmount ?? 0),
          },
        ];

  const subtotal = Number(invoice?.subtotal ?? visit.billAmount ?? 0);
  const discount = Number(invoice?.discount ?? 0);
  const total = Number(invoice?.totalAmount ?? visit.billAmount ?? subtotal);
  const amountPaid = Number(invoice?.amountPaid ?? visit.amountPaid ?? 0);
  const balanceDue = Number(invoice?.balanceAmount ?? visit.balanceDue ?? 0);
  const latestPayment = invoice?.payments[0];

  return {
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
    lines,
    subtotal,
    discount,
    total,
    amountPaid,
    balanceDue,
    routingNote: visit.routingNote ?? undefined,
  };
}
