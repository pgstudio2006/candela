import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { staffId } = await context.params;
    const { ctx, operator } = await resolveAdminOperator();
    const { assertConfigAccess } = await import("@/server/admin/guards");
    assertConfigAccess(operator);
    const { removeStaffMember } = await import("@/server/admin/staff-onboarding");
    await removeStaffMember(ctx, staffId);
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return NextResponse.json({ ok: true, data: { snapshot: serializeForClient(snapshot) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove staff.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
