import { NextResponse } from "next/server";
import { getServerContext } from "@/server/context";
import { processNotificationQueue } from "@/server/notifications";
import {
  runAllScheduledJobs,
  runScheduledJobsForContext,
  verifyCronSecret,
} from "@/server/scheduled-jobs";

/** Cron: notifications + HR attendance + MIS daily + audit retention */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");

    if (scope === "session") {
      const ctx = await getServerContext();
      const result = await runScheduledJobsForContext(ctx);
      return NextResponse.json({ ok: true, mode: "session", ...result });
    }

    const result = await runAllScheduledJobs();
    return NextResponse.json({ ok: true, mode: "system", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
