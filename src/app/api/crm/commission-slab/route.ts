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

    const operators = await prisma.crmOperatorCredential.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        defaultCommissionPercent: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForClient(
        operators.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          role: o.role,
          commissionPercent: Number(o.defaultCommissionPercent),
        })),
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load commission slabs.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await getServerContext();
    const body = await request.json();
    const { operatorId, commissionPercent } = body as { operatorId: string; commissionPercent: number };

    if (!operatorId || commissionPercent == null) {
      return NextResponse.json({ ok: false, error: "Missing operatorId or commissionPercent." }, { status: 400 });
    }

    if (commissionPercent < 0 || commissionPercent > 100) {
      return NextResponse.json({ ok: false, error: "Commission percent must be between 0 and 100." }, { status: 400 });
    }

    const updated = await prisma.crmOperatorCredential.update({
      where: { id: operatorId },
      data: { defaultCommissionPercent: commissionPercent },
      select: { id: true, name: true, defaultCommissionPercent: true },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForClient({
        id: updated.id,
        name: updated.name,
        commissionPercent: Number(updated.defaultCommissionPercent),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update commission slab.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
