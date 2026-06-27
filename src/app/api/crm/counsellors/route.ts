import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/server/context";
import { serializeForClient } from "@/server/serialize";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await getServerContext();

    const counsellors = await prisma.crmOperatorCredential.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }).catch(() => []);

    return NextResponse.json({
      ok: true,
      data: serializeForClient(counsellors),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load counsellors.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
