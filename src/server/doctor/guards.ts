import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { branchScope } from "@/server/tenancy";

export async function requireDoctorVisit(ctx: ServerContext, visitId: string) {
  const visit = await prisma.opdVisit.findFirst({
    where: { id: visitId, ...branchScope(ctx) },
  });
  if (!visit) {
    throw new ServerActionError("NOT_FOUND", "Visit not found in your branch.");
  }
  return visit;
}

export async function assertDoctorOwnsVisit(
  ctx: ServerContext,
  visitId: string,
  doctorId: string,
) {
  const visit = await requireDoctorVisit(ctx, visitId);
  if (visit.doctorId && visit.doctorId !== doctorId) {
    throw new ServerActionError("FORBIDDEN", "This visit is assigned to another doctor.");
  }
  return visit;
}

export async function requireDoctorConsult(ctx: ServerContext, visitId: string, doctorId: string) {
  await assertDoctorOwnsVisit(ctx, visitId, doctorId);
  const consult = await prisma.consultation.findUnique({ where: { visitId } });
  if (!consult) {
    throw new ServerActionError("NOT_FOUND", "Consultation not started — open the consult first.");
  }
  if (consult.doctorId && consult.doctorId !== doctorId) {
    throw new ServerActionError("FORBIDDEN", "This consultation belongs to another doctor.");
  }
  return consult;
}
