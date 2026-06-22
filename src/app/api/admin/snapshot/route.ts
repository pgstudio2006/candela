import { auth } from "@/auth";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { resolveAdminOperator } from "@/server/module-operator";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

/** Authenticated admin snapshot — avoids masked server-action failures in production. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx, operator } = await resolveAdminOperator();
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
