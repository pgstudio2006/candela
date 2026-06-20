import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/server/scheduled-jobs";
import { runAllScheduledJobs } from "@/server/scheduled-jobs";

/** @deprecated Use /api/cron/scheduled-jobs — kept for backward compatibility */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAllScheduledJobs();
  return NextResponse.json({ ok: true, mode: "system", legacy: true, ...result });
}
