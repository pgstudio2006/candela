import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPharmacySnapshot } from "@/server/pharmacy/index";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const operatorId = searchParams.get("operatorId");
  if (!operatorId) {
    return NextResponse.json({ ok: false, error: "Missing operatorId." }, { status: 400 });
  }

  try {
    const ctx = await requireModule("pharmacy");
    const snapshot = await getPharmacySnapshot(ctx, operatorId);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pharmacy workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
