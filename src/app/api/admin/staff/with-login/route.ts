import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { serializeForClient } from "@/server/serialize";
import { NextResponse } from "next/server";

type StaffOnboardBody = {
  staff: Omit<import("@/design-system/admin-data").StaffMember, "id">;
  moduleRole?: string;
  password?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as StaffOnboardBody;
    const { ctx, operator } = await resolveAdminOperator();
    const { assertConfigAccess } = await import("@/server/admin/guards");
    assertConfigAccess(operator);
    const { addStaffWithLogin } = await import("@/server/admin/staff-onboarding");
    const result = await addStaffWithLogin(ctx, body);
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        snapshot: serializeForClient(snapshot),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to onboard staff.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
