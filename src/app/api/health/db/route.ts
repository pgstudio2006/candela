import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Check = { name: string; ok: boolean; detail?: string };

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

  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      ok,
      message: ok
        ? "Database schema looks compatible."
        : "Schema mismatch — run `npx prisma db push` on production DATABASE_URL.",
      checks,
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
