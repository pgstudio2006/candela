import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ctx = await requireModule("admin");
    const body = await request.json();
    const { label, category, description, rate, unit, gstPercent, hsnCode, active } = body;

    const charge = await prisma.serviceCharge.update({
      where: { id },
      data: {
        label,
        category,
        description,
        rate: rate !== undefined ? rate : undefined,
        unit,
        gstPercent: gstPercent !== undefined ? gstPercent : undefined,
        hsnCode,
        active: active !== undefined ? active : undefined,
      },
    });

    return NextResponse.json({ ok: true, data: serializeForClient(charge) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update service charge.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { id } = await params;
    await requireModule("admin");
    await prisma.serviceCharge.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete service charge.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
