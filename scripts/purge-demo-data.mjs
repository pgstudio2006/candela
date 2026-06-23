/**
 * Purge demo patients, visits, and legacy seed doctors from the database.
 *
 * Run on production (backup first!):
 *   node scripts/purge-demo-data.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LEGACY_DOCTOR_IDS = new Set(["dr_1", "dr_2", "dr_3"]);
const DEMO_PATIENT_IDS = /^p\d+$/;

function stripLegacy(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map(String).filter((id) => !LEGACY_DOCTOR_IDS.has(id));
}

async function main() {
  console.log("Purging demo clinical data…");

  const patients = await prisma.patient.findMany({ select: { id: true, fullName: true } });
  const demoPatientIds = patients.filter((p) => DEMO_PATIENT_IDS.test(p.id)).map((p) => p.id);

  if (demoPatientIds.length) {
    await prisma.payment.deleteMany({ where: { invoice: { patientId: { in: demoPatientIds } } } }).catch(() => undefined);
    await prisma.invoiceLine.deleteMany({ where: { invoice: { patientId: { in: demoPatientIds } } } }).catch(() => undefined);
    await prisma.invoice.deleteMany({ where: { patientId: { in: demoPatientIds } } });
    await prisma.consultation.deleteMany({ where: { visit: { patientId: { in: demoPatientIds } } } }).catch(() => undefined);
    await prisma.consultNote.deleteMany({ where: { visit: { patientId: { in: demoPatientIds } } } }).catch(() => undefined);
    await prisma.formSubmission.deleteMany({ where: { visitId: { contains: "v" } } }).catch(() => undefined);
    await prisma.opdVisit.deleteMany({ where: { patientId: { in: demoPatientIds } } });
    await prisma.visit.deleteMany({ where: { patientId: { in: demoPatientIds } } }).catch(() => undefined);
    await prisma.appointment.deleteMany({ where: { patientId: { in: demoPatientIds } } }).catch(() => undefined);
    await prisma.patient.deleteMany({ where: { id: { in: demoPatientIds } } });
    console.log(`  Removed ${demoPatientIds.length} demo patients`);
  } else {
    console.log("  No demo patients (p1, p2, …) found");
  }

  console.log("Stripping legacy demo doctors from departments…");
  const departments = await prisma.adminDepartment.findMany();
  let deptUpdates = 0;
  for (const dept of departments) {
    const next = stripLegacy(dept.doctorIds);
    const raw = Array.isArray(dept.doctorIds) ? dept.doctorIds.map(String) : [];
    if (raw.length !== next.length) {
      await prisma.adminDepartment.update({ where: { id: dept.id }, data: { doctorIds: next } });
      deptUpdates += 1;
    }
  }
  console.log(`  Updated ${deptUpdates} departments`);

  console.log("Removing demo revenue policies tied to legacy doctors…");
  const policies = await prisma.adminRevenuePolicy.findMany();
  for (const policy of policies) {
    if (policy.doctorId && LEGACY_DOCTOR_IDS.has(policy.doctorId)) {
      await prisma.adminRevenuePolicy.delete({ where: { id: policy.id } });
    }
  }

  console.log("Removing non-admin demo staff records…");
  const demoStaffEmails = [
    "anita@navayu.in",
    "priya@navayu.in",
    "finance@navayu.in",
    "mrd@navayu.in",
  ];
  const removedStaff = await prisma.adminStaff.deleteMany({
    where: { email: { in: demoStaffEmails } },
  });
  console.log(`  Removed ${removedStaff.count} demo staff rows`);

  const summary = {
    patientsRemaining: await prisma.patient.count(),
    visitsRemaining: await prisma.opdVisit.count(),
    staffRemaining: await prisma.adminStaff.count(),
    departments: await prisma.adminDepartment.count(),
  };
  console.log("\nDone:", JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
