import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNurseSnapshot } from "@/server/nurse";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await requireModule("nurse");
    const snapshot = await getNurseSnapshot(ctx);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load nurse workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
