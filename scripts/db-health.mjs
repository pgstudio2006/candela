/**
 * Run against production DATABASE_URL from Coolify shell:
 *   export DATABASE_URL="postgresql://..."
 *   node scripts/db-health.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const checks = [];

async function probe(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

await probe("patient", () => prisma.patient.findFirst({ select: { id: true } }));
await probe("opdVisit", () => prisma.opdVisit.findFirst({ select: { id: true } }));
await probe("visit", () => prisma.visit.findFirst({ select: { id: true } }));
await probe("auditLog", () => prisma.auditLog.findFirst({ select: { id: true } }));
await probe("adminStaff.branchId", () =>
  prisma.adminStaff.findFirst({ where: { branchId: "branch_gurgaon" }, select: { id: true } }),
);
await probe("adminExpense.branchId", () =>
  prisma.adminExpense.findFirst({ select: { id: true, branchId: true } }),
);
await probe("adminMrdRequest.branchId", () =>
  prisma.adminMrdRequest.findFirst({ select: { id: true, branchId: true } }),
);
await probe("consultation", () => prisma.consultation.findFirst({ select: { id: true } }));

await prisma.$disconnect();

const ok = checks.every((c) => c.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
if (!ok) {
  console.error("\nFix: npx prisma db push");
  process.exit(1);
}
