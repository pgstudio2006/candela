import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Check = { name: string; ok: boolean; detail?: string };

const BRANCH = "branch_gurgaon";
const TENANT = "tenant_navayu";

/** Ops endpoint — verify production DB schema matches current Prisma models. */
export async function GET() {
  const checks: Check[] = [];

  async function probe(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      checks.push({ name, ok: true });
    } catch (e) {
      checks.push({
        name,
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const branchScope = { tenantId: TENANT, branchId: BRANCH };

  await probe("patient", () => prisma.patient.findFirst({ select: { id: true } }));
  await probe("patient.branchScope", () =>
    prisma.patient.findMany({ where: branchScope, take: 1, select: { id: true, fullName: true } }),
  );
  await probe("opdVisit", () => prisma.opdVisit.findFirst({ select: { id: true } }));
  await probe("opdVisit.branchScope", () =>
    prisma.opdVisit.findMany({ where: branchScope, take: 1, select: { id: true } }),
  );
  await probe("visit", () => prisma.visit.findFirst({ select: { id: true } }));
  await probe("appointment", () =>
    prisma.appointment.findMany({ where: branchScope, take: 1, select: { id: true } }),
  );
  await probe("billingHandoff", () =>
    prisma.billingHandoff.findMany({ where: { branchId: BRANCH }, take: 1, select: { id: true } }),
  );
  await probe("formSubmission", () => prisma.formSubmission.findFirst({ select: { id: true } }));
  await probe("auditLog", () => prisma.auditLog.findFirst({ select: { id: true } }));
  await probe("adminStaff.branchId", () =>
    prisma.adminStaff.findMany({ where: { branchId: BRANCH }, take: 1, select: { id: true } }),
  );
  await probe("adminDepartment", () =>
    prisma.adminDepartment.findMany({ where: { active: true }, take: 1, select: { id: true } }),
  );
  await probe("adminExpense.branchId", () =>
    prisma.adminExpense.findFirst({ select: { id: true, branchId: true } }),
  );
  await probe("adminMrdRequest.branchId", () =>
    prisma.adminMrdRequest.findFirst({ select: { id: true, branchId: true } }),
  );
  await probe("adminDiseaseNode", () => prisma.adminDiseaseNode.findFirst({ select: { id: true } }));
  await probe("adminDiseaseCluster", () => prisma.adminDiseaseCluster.findFirst({ select: { id: true } }));
  await probe("adminGeoPin", () => prisma.adminGeoPin.findFirst({ select: { id: true } }));
  await probe("adminRevenuePolicy", () => prisma.adminRevenuePolicy.findFirst({ select: { id: true } }));
  await probe("adminMisReport", () => prisma.adminMisReport.findFirst({ select: { id: true } }));
  await probe("adminAuditLog", () => prisma.adminAuditLog.findFirst({ select: { id: true } }));
  await probe("adminSetting", () => prisma.adminSetting.findFirst({ select: { id: true } }));
  await probe("documentTemplate", () => prisma.documentTemplate.findFirst({ select: { id: true } }));
  await probe("doctorTemplate", () => prisma.doctorTemplate.findFirst({ select: { id: true } }));
  await probe("consultation", () => prisma.consultation.findFirst({ select: { id: true } }));
  await probe("session", () => prisma.session.findFirst({ select: { id: true, status: true } }));
  await probe("role", () => prisma.role.findFirst({ select: { id: true, key: true } }));

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return NextResponse.json(
    {
      ok,
      message: ok
        ? "Database schema looks compatible with workspace snapshots."
        : `Schema mismatch (${failed.length} check(s) failed) — run prisma db push inside the Candela container.`,
      checks,
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
