import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { branchScope } from "@/server/tenancy";

export async function requireCounsellorVisit(ctx: ServerContext, visitId: string) {
  const visit = await prisma.opdVisit.findFirst({
    where: { id: visitId, ...branchScope(ctx) },
  });
  if (!visit) {
    throw new ServerActionError("NOT_FOUND", "Visit not found in your branch.");
  }
  return visit;
}

export async function requireCounsellorQueueItem(ctx: ServerContext, visitId: string) {
  await requireCounsellorVisit(ctx, visitId);
  const item = await prisma.counsellorQueueItem.findUnique({ where: { visitId } });
  if (!item) {
    throw new ServerActionError("NOT_FOUND", "Patient is not in the counsellor queue.");
  }
  return item;
}
