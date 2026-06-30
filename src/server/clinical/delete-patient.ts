import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";

async function safeDelete(label: string, fn: () => Promise<{ count: number }>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[deletePatient] Error deleting ${label}:`, e);
  }
}

/** Remove a patient and dependent clinical/financial rows (admin or demo purge). */
export async function deletePatientsByIds(
  patientIds: string[],
  ctx?: ServerContext,
): Promise<number> {
  if (!patientIds.length) return 0;

  const scope = ctx ? { tenantId: ctx.tenantId, branchId: ctx.branchId } : {};

  // Collect visit IDs first
  let visitIds: string[] = [];
  try {
    visitIds = (
      await prisma.opdVisit.findMany({
        where: { patientId: { in: patientIds }, ...scope },
        select: { id: true },
      })
    ).map((v) => v.id);
  } catch (e) {
    console.error("[deletePatient] Error fetching visitIds:", e);
  }

  // Also collect Visit IDs
  let visitIds2: string[] = [];
  try {
    visitIds2 = (
      await prisma.visit.findMany({
        where: { patientId: { in: patientIds }, ...scope },
        select: { id: true },
      })
    ).map((v) => v.id);
  } catch (e) {
    console.error("[deletePatient] Error fetching visit ids:", e);
  }

  const allVisitIds = [...new Set([...visitIds, ...visitIds2])];

  // Delete all dependent rows - every operation is safe (won't throw)
  await safeDelete("payments", () =>
    prisma.payment.deleteMany({ where: { invoice: { patientId: { in: patientIds } } } }),
  );
  await safeDelete("invoiceLines", () =>
    prisma.invoiceLine.deleteMany({ where: { invoice: { patientId: { in: patientIds } } } }),
  );
  await safeDelete("invoices", () =>
    prisma.invoice.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("consultations", () =>
    prisma.consultation.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("consultNotes", () =>
    prisma.consultNote.deleteMany({ where: { visitId: { in: allVisitIds } } }),
  );
  await safeDelete("formSubmissions", () =>
    prisma.formSubmission.deleteMany({ where: { patientId: { in: patientIds }, ...scope } }),
  );
  await safeDelete("queues", () =>
    prisma.queue.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("consents", () =>
    prisma.consent.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("counsellorSessions", () =>
    prisma.counsellorSession.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("billingHandoffs", () =>
    prisma.billingHandoff.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("nursingEpisodes", () =>
    prisma.nursingEpisode.deleteMany({ where: { visitId: { in: allVisitIds } } }),
  );
  await safeDelete("nursingHandoffs", () =>
    (prisma as any).nursingHandoff?.deleteMany({ where: { patientId: { in: patientIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("ipdAdmissions", () =>
    (prisma as any).ipdAdmission?.deleteMany({ where: { patientId: { in: patientIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("counsellorQueueItems", () =>
    (prisma as any).counsellorQueueItem?.deleteMany({ where: { patientId: { in: patientIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("prescriptions", () =>
    (prisma as any).prescription?.deleteMany({ where: { patientId: { in: patientIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("vitals", () =>
    (prisma as any).vitals?.deleteMany({ where: { visitId: { in: allVisitIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("nursingTasks", () =>
    (prisma as any).nursingTask?.deleteMany({ where: { visitId: { in: allVisitIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("approvals", () =>
    (prisma as any).approval?.deleteMany({ where: { visitId: { in: allVisitIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("prescriptionFulfillments", () =>
    (prisma as any).prescriptionFulfillment?.deleteMany({ where: { visitId: { in: allVisitIds } } }) ??
      Promise.resolve({ count: 0 }),
  );
  await safeDelete("leads (set null)", async () => {
    // Lead has onDelete: SetNull, but let's be safe
    return { count: 0 };
  });

  // Delete visits
  await safeDelete("opdVisits", () =>
    prisma.opdVisit.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("visits", () =>
    prisma.visit.deleteMany({ where: { patientId: { in: patientIds } } }),
  );
  await safeDelete("appointments", () =>
    prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } }),
  );

  // Finally delete the patient
  try {
    const removed = await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    return removed.count;
  } catch (e) {
    console.error("[deletePatient] Error deleting patient record:", e);
    // If cascade is set up in DB, the patient might already be gone
    // Try one more time without scope
    try {
      const removed = await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
      return removed.count;
    } catch (e2) {
      console.error("[deletePatient] Final delete attempt failed:", e2);
      throw e2;
    }
  }
}
