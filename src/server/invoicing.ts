import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";

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
