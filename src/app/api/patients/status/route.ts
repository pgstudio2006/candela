import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth";
import { branchScope } from "@/server/tenancy";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const { patientId, status } = body;

    if (!patientId || !status) {
      return NextResponse.json({ ok: false, error: "Missing patientId or status" }, { status: 400 });
    }

    const scope = branchScope(ctx);

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, ...scope },
    });

    if (!patient) {
      return NextResponse.json({ ok: false, error: "Patient not found" }, { status: 404 });
    }

    await prisma.patient.update({
      where: { id: patientId },
      data: { status } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating patient status:", error);
    return NextResponse.json({ ok: false, error: "Failed to update status" }, { status: 500 });
  }
}
