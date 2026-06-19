import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";

type OpdRow = {
  id: string;
  patientId: string;
  tenantId: string | null;
  branchId: string | null;
  token: number | null;
  stage: string;
  departmentId: string | null;
  doctorId: string | null;
  doctorName: string | null;
  billing: string | null;
  exam: string | null;
  appointment: boolean;
  appointmentTime: string | null;
  checkInAt: string | null;
  billAmount: number | null;
  amountPaid: number | null;
  balanceDue: number | null;
  treatmentPath: string | null;
  deferredReason: string | null;
  routingNote: string | null;
  counselPackageLabel: string | null;
};

/** Keep enterprise Visit row in sync with live OpdVisit (same id). */
export async function syncVisitFromOpdVisit(
  ctx: ServerContext,
  opd: OpdRow,
  tx: Prisma.TransactionClient = prisma,
) {
  const scope = branchScope(ctx);
  const checkIn =
    opd.checkInAt && opd.checkInAt.includes("T")
      ? new Date(opd.checkInAt)
      : opd.checkInAt
        ? new Date()
        : null;

  await tx.visit.upsert({
    where: { id: opd.id },
    create: {
      id: opd.id,
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      patientId: opd.patientId,
      doctorId: opd.doctorId,
      doctorName: opd.doctorName,
      departmentId: opd.departmentId,
      token: opd.token,
      stage: opd.stage,
      billingStatus: opd.billing,
      examStatus: opd.exam ?? "not_started",
      treatmentPath: opd.treatmentPath,
      checkInAt: checkIn,
      billAmount: opd.billAmount,
      amountPaid: opd.amountPaid,
      balanceDue: opd.balanceDue,
      deferredReason: opd.deferredReason,
      routingNote: opd.routingNote,
      packageLabel: opd.counselPackageLabel,
    },
    update: {
      stage: opd.stage,
      doctorId: opd.doctorId,
      doctorName: opd.doctorName,
      departmentId: opd.departmentId,
      token: opd.token,
      billingStatus: opd.billing,
      examStatus: opd.exam ?? "not_started",
      treatmentPath: opd.treatmentPath,
      checkInAt: checkIn,
      billAmount: opd.billAmount,
      amountPaid: opd.amountPaid,
      balanceDue: opd.balanceDue,
      deferredReason: opd.deferredReason,
      routingNote: opd.routingNote,
      packageLabel: opd.counselPackageLabel,
    },
  });

  await tx.opdVisit.update({
    where: { id: opd.id },
    data: { visitId: opd.id, tenantId: scope.tenantId, branchId: scope.branchId },
  });
}
