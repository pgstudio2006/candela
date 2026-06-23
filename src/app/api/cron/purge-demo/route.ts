import { purgeDemoClinicalData } from "@/server/admin/purge-demo-clinical";
import { verifyCronSecret } from "@/server/scheduled-jobs";
import { NextResponse } from "next/server";

/** Ops: remove demo patients/doctors from DB (CRON_SECRET or ADMIN_BOOTSTRAP_PASSWORD header). */
export async function POST(request: Request) {
  const bootstrapHeader = request.headers.get("x-bootstrap-secret");
  const bootstrapEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const authorized =
    verifyCronSecret(request) ||
    (Boolean(bootstrapEnv) && bootstrapHeader === bootstrapEnv);

  if (!authorized) {
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
