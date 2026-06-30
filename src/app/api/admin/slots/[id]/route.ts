import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth";
import { branchScope } from "@/server/tenancy";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const { doctorId, doctorName, departmentId, date, startTime, endTime, capacity, status, notes } = body;

    const scope = branchScope(ctx);

    const slot = await prisma.slot.findFirst({
      where: { id: params.id, ...scope },
    });

    if (!slot) {
      return NextResponse.json({ ok: false, error: "Slot not found" }, { status: 404 });
    }

    const updated = await prisma.slot.update({
      where: { id: params.id },
      data: {
        ...(doctorId !== undefined && { doctorId }),
        ...(doctorName !== undefined && { doctorName }),
        ...(departmentId !== undefined && { departmentId }),
        ...(date !== undefined && { date }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(capacity !== undefined && { capacity }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json({ ok: false, error: "Failed to update slot" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    const scope = branchScope(ctx);

    const slot = await prisma.slot.findFirst({
      where: { id: params.id, ...scope },
    });

    if (!slot) {
      return NextResponse.json({ ok: false, error: "Slot not found" }, { status: 404 });
    }

    await prisma.slot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return NextResponse.json({ ok: false, error: "Failed to delete slot" }, { status: 500 });
  }
}
