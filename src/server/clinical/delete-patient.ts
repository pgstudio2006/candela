import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";

/** Remove a patient and dependent clinical/financial rows (admin or demo purge). */
export async function deletePatientsByIds(
  patientIds: string[],
  ctx?: ServerContext,
): Promise<number> {
  if (!patientIds.length) return 0;

  const scope = ctx ? { tenantId: ctx.tenantId, branchId: ctx.branchId } : {};

  const visitIds = (
    await prisma.opdVisit.findMany({
      where: { patientId: { in: patientIds }, ...scope },
      select: { id: true },
    })
  ).map((v) => v.id);

  try {
    await prisma.payment
      .deleteMany({ where: { invoice: { patientId: { in: patientIds } } } })
      .catch(() => undefined);
  } catch (e) {
    console.error("Error deleting payments:", e);
  }
  
  try {
    await prisma.invoiceLine
      .deleteMany({ where: { invoice: { patientId: { in: patientIds } } } })
      .catch(() => undefined);
  } catch (e) {
    console.error("Error deleting invoice lines:", e);
  }
  
  try {
    await prisma.invoice.deleteMany({ where: { patientId: { in: patientIds } } });
  } catch (e) {
    console.error("Error deleting invoices:", e);
  }
  
  try {
    await prisma.consultation.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting consultations:", e);
  }
  
  if (visitIds.length) {
    try {
      await prisma.consultNote.deleteMany({ where: { visitId: { in: visitIds } } }).catch(() => undefined);
    } catch (e) {
      console.error("Error deleting consult notes:", e);
    }
  }
  
  try {
    await prisma.formSubmission
      .deleteMany({ where: { patientId: { in: patientIds }, ...scope } })
      .catch(() => undefined);
  } catch (e) {
    console.error("Error deleting form submissions:", e);
  }
  
  try {
    await prisma.queue.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting queue:", e);
  }
  
  try {
    await prisma.consent.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting consent:", e);
  }
  
  try {
    await prisma.counsellorSession
      .deleteMany({ where: { patientId: { in: patientIds } } })
      .catch(() => undefined);
  } catch (e) {
    console.error("Error deleting counsellor sessions:", e);
  }
  
  try {
    await prisma.billingHandoff
      .deleteMany({ where: { patientId: { in: patientIds } } })
      .catch(() => undefined);
  } catch (e) {
    console.error("Error deleting billing handoff:", e);
  }
  
  try {
    await prisma.nursingEpisode.deleteMany({ where: { visitId: { in: visitIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting nursing episodes:", e);
  }
  
  try {
    await prisma.opdVisit.deleteMany({ where: { patientId: { in: patientIds } } });
  } catch (e) {
    console.error("Error deleting opd visits:", e);
  }
  
  try {
    await prisma.visit.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting visits:", e);
  }
  
  try {
    await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  } catch (e) {
    console.error("Error deleting appointments:", e);
  }

  try {
    const removed = await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    return removed.count;
  } catch (e) {
    console.error("Error deleting patients:", e);
    throw e;
  }
}
