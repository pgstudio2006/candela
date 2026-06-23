import { prisma } from "@/lib/prisma";
import { isDemoPatient, purgeDemoClinicalData } from "@/server/admin/purge-demo-clinical";
import { verifyCronSecret } from "@/server/scheduled-jobs";
import { NextResponse } from "next/server";

/** Ops: remove demo patients/doctors from DB (CRON_SECRET or ADMIN_BOOTSTRAP_PASSWORD header). */
function isAuthorized(request: Request) {
  const bootstrapHeader = request.headers.get("x-bootstrap-secret");
  const bootstrapEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  return (
    verifyCronSecret(request) ||
    (Boolean(bootstrapEnv) && bootstrapHeader === bootstrapEnv)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    select: { id: true, fullName: true, name: true, uhid: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    total: await prisma.patient.count(),
    demoCount: patients.filter(isDemoPatient).length,
    patients: patients.map((p) => ({
      id: p.id,
      name: p.fullName || p.name,
      uhid: p.uhid,
      demo: isDemoPatient(p),
    })),
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeDemoClinicalData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to purge demo clinical data.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
