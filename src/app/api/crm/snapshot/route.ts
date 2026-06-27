import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCrmSnapshot } from "@/server/crm/index";
import { getServerContext } from "@/server/context";
import { serializeForClient } from "@/server/serialize";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get("operatorId") ?? "";

    // Resolve operatorId from CrmOperatorCredential if not provided
    let effectiveOperatorId = operatorId;
    if (!effectiveOperatorId && session.user.email) {
      const email = session.user.email.trim().toLowerCase();
      const cred = await prisma.crmOperatorCredential.findUnique({ where: { email } });
      if (cred?.active) {
        effectiveOperatorId = cred.id;
      }
    }

    const snapshot = await getCrmSnapshot(ctx, effectiveOperatorId);
    return NextResponse.json({ ok: true, data: serializeForClient(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load CRM workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
