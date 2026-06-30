import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/server/serialize";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx } = await resolveAdminOperator();
    const { searchParams } = request.nextUrl;
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? "50") || 50));

    const logs = await prisma.whatsAppLog.findMany({
      where: { branchId: ctx.branchId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, data: serializeForClient(logs) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load logs.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
