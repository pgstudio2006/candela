import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerContext } from "@/server/context";
import { processNotificationQueue } from "@/server/notifications";

/** Manual/cron trigger: GET /api/cron/notifications?secret=... */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET ?? "candela-cron-demo";

  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Sign in required for branch context" }, { status: 401 });
  }

  const ctx = await getServerContext();
  const result = await processNotificationQueue(ctx);
  return NextResponse.json({ ok: true, ...result });
}
