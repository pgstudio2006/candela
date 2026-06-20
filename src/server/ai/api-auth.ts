import { auth } from "@/auth";
import type { CandelaRole } from "@/design-system/modules";
import { NextResponse } from "next/server";

export async function requireApiAuth(roles?: CandelaRole[]) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = session.user.role as CandelaRole;
  if (roles?.length && !roles.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, role };
}
