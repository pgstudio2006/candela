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
    const { label, amount, sessions, dept, description, services, active } = body;

    // Delete existing package services
    await prisma.packageService.deleteMany({
      where: { packageId: id },
    });

    // @ts-ignore - description field added to schema
    const pkg: any = await prisma.package.update({
      where: { id },
      data: {
        label,
        amount: amount !== undefined ? amount : undefined,
        sessions: sessions !== undefined ? Number(sessions) : undefined,
        dept,
        description,
        active: active !== undefined ? active : undefined,
      },
    });

    // Recreate services
    if (services && services.length > 0) {
      await prisma.packageService.createMany({
        data: services.map((s: any) => ({
          packageId: id,
          serviceId: s.serviceId,
          quantity: s.quantity || 1,
        })),
      });
    }

    // Fetch with relations
    const pkgWithServices: any = await prisma.package.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    const serialized = {
      ...pkgWithServices,
      services: (pkgWithServices.services || []).map((ps: any) => ({
        serviceId: ps.serviceId,
        label: ps.service.label,
        quantity: ps.quantity,
        rate: Number(ps.service.rate),
      })),
    };

    return NextResponse.json({ ok: true, data: serializeForClient(serialized) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update package.";
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
    await prisma.package.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete package.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
