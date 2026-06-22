import { prisma } from "@/lib/prisma";
import { resolveDoctorName } from "@/lib/clinical-roster";
import { loadClinicalRoster } from "@/server/clinical/roster";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";
import { requireDoctorVisit } from "@/server/doctor/guards";

/** Assign visit to the active doctor and block if another doctor already owns the consult. */
export async function ensureVisitDoctorAssignment(
  ctx: ServerContext,
  visitId: string,
  doctorId: string,
) {
  const visit = await requireDoctorVisit(ctx, visitId);
  const roster = await loadClinicalRoster(ctx);
  const doctorName = resolveDoctorName(doctorId, roster);

  const blockingConsult = await prisma.consultation.findFirst({
    where: {
      visitId,
      doctorId: { not: doctorId },
      status: { in: ["in_progress", "completed"] },
    },
  });
  if (blockingConsult) {
    throw new ServerActionError(
      "FORBIDDEN",
      "This visit is already being handled by another doctor.",
    );
  }

  if (visit.doctorId !== doctorId) {
    await prisma.opdVisit.update({
      where: { id: visitId },
      data: { doctorId, doctorName },
    });
    const updated = await prisma.opdVisit.findUnique({ where: { id: visitId } });
    if (updated) {
      await syncVisitFromOpdVisit(ctx, updated);
      return updated;
    }
  }

  return visit;
}
