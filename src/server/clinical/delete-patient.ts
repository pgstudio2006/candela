import { prisma } from "@/lib/prisma";

/** Remove a patient and dependent clinical/financial rows (admin or demo purge). */
export async function deletePatientsByIds(patientIds: string[]): Promise<number> {
  if (!patientIds.length) return 0;

  const visitIds = (
    await prisma.opdVisit.findMany({
      where: { patientId: { in: patientIds } },
      select: { id: true },
    })
  ).map((v) => v.id);

  await prisma.payment
    .deleteMany({ where: { invoice: { patientId: { in: patientIds } } } })
    .catch(() => undefined);
  await prisma.invoiceLine
    .deleteMany({ where: { invoice: { patientId: { in: patientIds } } } })
    .catch(() => undefined);
  await prisma.invoice.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.consultation.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  if (visitIds.length) {
    await prisma.consultNote.deleteMany({ where: { visitId: { in: visitIds } } }).catch(() => undefined);
  }
  await prisma.formSubmission
    .deleteMany({ where: { patientId: { in: patientIds } } })
    .catch(() => undefined);
  await prisma.queue.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.consent.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.counsellorSession
    .deleteMany({ where: { patientId: { in: patientIds } } })
    .catch(() => undefined);
  await prisma.billingHandoff
    .deleteMany({ where: { patientId: { in: patientIds } } })
    .catch(() => undefined);
  await prisma.nursingEpisode.deleteMany({ where: { visitId: { in: visitIds } } }).catch(() => undefined);
  await prisma.opdVisit.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.visit.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);

  const removed = await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  return removed.count;
}
