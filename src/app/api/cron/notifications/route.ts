import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerContext } from "@/server/context";
import { processAllTenantNotifications, processNotificationQueue } from "@/server/notifications";

/** Manual/cron trigger: GET /api/cron/notifications?secret=... */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET ?? "candela-cron-demo";

  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();
  if (session?.user?.tenantId && session.user.branchId) {
    const ctx = await getServerContext();
    const result = await processNotificationQueue(ctx);
    return NextResponse.json({ ok: true, mode: "session", ...result });
  }

  const result = await processAllTenantNotifications();
  return NextResponse.json({ ok: true, mode: "system", ...result });
}
