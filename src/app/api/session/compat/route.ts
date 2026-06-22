import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enrichCompatSession } from "@/server/session-enrichment";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ session: null });
  }

  const compat = await enrichCompatSession({
    tenant: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    branchId: session.user.branchId,
    branchName: session.user.branchName,
    role: session.user.role,
    userName: session.user.name ?? "",
    userEmail: session.user.email ?? "",
  });

  return NextResponse.json({ session: compat });
}
