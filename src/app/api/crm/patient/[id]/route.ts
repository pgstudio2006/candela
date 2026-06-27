import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/server/context";
import { serializeForClient } from "@/server/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const patient = await prisma.patient.findFirst({
      where: { id, branchId: ctx.branchId },
      include: {
        visits: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        appointments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ ok: false, error: "Patient not found." }, { status: 404 });
    }

    // Get prescriptions from visits
    const visitIds = patient.visits.map((v) => v.id);
    const prescriptions = await prisma.prescription.findMany({
      where: { visitId: { in: visitIds } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []);

    // Get consult notes
    const consultations = await prisma.consultNote.findMany({
      where: { visitId: { in: visitIds } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []);

    return NextResponse.json({
      ok: true,
      data: serializeForClient({
        patient: {
          id: patient.id,
          uhid: patient.uhid,
          name: patient.name,
          fullName: patient.fullName,
          phone: patient.phone,
          email: patient.email,
          age: patient.age ? String(patient.age) : null,
          gender: patient.gender,
          assignedCounsellorId: patient.assignedCounsellorId,
          assignedCounsellorName: patient.assignedCounsellorName,
          leadSourceId: patient.leadSourceId,
          createdAt: patient.createdAt.toISOString(),
        },
        visits: patient.visits.map((v) => ({
          id: v.id,
          doctorName: v.doctorName ?? "",
          stage: v.stage,
          token: v.token ?? null,
          billing: v.billingStatus ?? "unbilled",
          billAmount: v.billAmount ? Number(v.billAmount) : null,
          treatmentPath: v.treatmentPath ?? null,
          createdAt: v.createdAt.toISOString(),
        })),
        appointments: patient.appointments.map((a) => ({
          id: a.id,
          doctorName: a.doctorName ?? "",
          doctorId: a.doctorId ?? null,
          date: a.date ?? null,
          time: a.time ?? null,
          status: a.status,
          source: a.source ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
        prescriptions: (prescriptions as any[]).map((p) => ({
          id: p.id,
          visitId: p.visitId,
          medicines: Array.isArray(p.lines) ? p.lines : [],
          notes: p.counselingNotes ?? p.notes ?? "",
          createdAt: p.createdAt.toISOString(),
        })),
        consultations: (consultations as any[]).map((c) => ({
          id: c.id,
          visitId: c.visitId,
          diagnosis: typeof c.diagnosis === "string" ? c.diagnosis : JSON.stringify(c.diagnosis ?? ""),
          treatmentPlan: typeof c.treatment === "string" ? c.treatment : JSON.stringify(c.treatment ?? ""),
          advice: c.doctorAdvice ?? c.notes ?? "",
          createdAt: c.createdAt.toISOString(),
        })),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load patient.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
