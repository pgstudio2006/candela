import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveHrOperator } from "@/server/module-operator";
import { getHrSnapshotForContext } from "@/server/hr/index";
import { serializeForClient } from "@/server/serialize";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx, operatorId } = await resolveHrOperator();
    const snapshot = await getHrSnapshotForContext(ctx, operatorId);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load HR workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
