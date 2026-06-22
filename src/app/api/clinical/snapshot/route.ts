import { auth } from "@/auth";
import { getClinicalSnapshot } from "@/server/clinical";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

/** Authenticated frontdesk snapshot — avoids masked server-action failures in production. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await requireModule("frontdesk");
    const snapshot = await getClinicalSnapshot(ctx);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load frontdesk workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
