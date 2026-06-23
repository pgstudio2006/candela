import { auth } from "@/auth";
import { getDoctorSnapshot } from "@/server/doctor";
import { resolveDoctorIdForContext } from "@/server/clinical/roster";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

/** Authenticated doctor snapshot — avoids masked server-action failures in production. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await requireModule("doctor");
    const doctorId = await resolveDoctorIdForContext(ctx);
    const snapshot = await getDoctorSnapshot(ctx, doctorId);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load doctor workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
