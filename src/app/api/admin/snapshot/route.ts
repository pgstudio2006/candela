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
    let data: ReturnType<typeof serializeForClient<typeof snapshot>>;
    try {
      data = serializeForClient(snapshot);
    } catch (serializeError) {
      const message =
        serializeError instanceof Error
          ? serializeError.message
          : "Admin workspace data could not be serialized.";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
