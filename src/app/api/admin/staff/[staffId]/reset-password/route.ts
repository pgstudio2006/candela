import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { staffId } = await params;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const { ctx, operator } = await resolveAdminOperator();
    const { assertConfigAccess } = await import("@/server/admin/guards");
    assertConfigAccess(operator);
    const { resetStaffLoginPassword } = await import("@/server/admin/staff-onboarding");
    const result = await resetStaffLoginPassword(ctx, staffId, body.password);
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        snapshot: serializeForClient(snapshot),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
