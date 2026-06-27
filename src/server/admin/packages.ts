import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/auth";
import type { ServerContext } from "@/server/context";

export type PackageServiceInput = {
  serviceId: string;
  quantity: number;
};

export type PackageInput = {
  label: string;
  amount: number;
  sessions?: number;
  dept?: string;
  services: PackageServiceInput[];
  active?: boolean;
};

export async function getPackages(ctx: ServerContext) {
  await requireModule("admin");
  return prisma.package.findMany({
    where: { branchId: ctx.branchId },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: { label: "asc" },
  });
}

export async function createPackage(
  ctx: ServerContext,
  data: PackageInput,
) {
  await requireModule("admin");
  const pkg = await prisma.package.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      label: data.label,
      amount: data.amount,
      sessions: data.sessions,
      dept: data.dept,
      active: data.active ?? true,
    },
  });
  
  // Create services separately
  for (const s of data.services) {
    await prisma.packageService.create({
      data: {
        packageId: pkg.id,
        serviceId: s.serviceId,
        quantity: s.quantity,
      },
    });
  }
  
  return prisma.package.findUnique({
    where: { id: pkg.id },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
  });
}

export async function updatePackage(
  ctx: ServerContext,
  id: string,
  data: Partial<PackageInput>,
) {
  await requireModule("admin");
  
  // If services are provided, we need to handle the relation update
  if (data.services) {
    // Delete existing services
    await prisma.packageService.deleteMany({
      where: { packageId: id },
    });
    
    // Create new services
    for (const s of data.services) {
      await prisma.packageService.create({
        data: {
          packageId: id,
          serviceId: s.serviceId,
          quantity: s.quantity,
        },
      });
    }
  }
  
  return prisma.package.update({
    where: { id, branchId: ctx.branchId },
    data: {
      ...(data.label && { label: data.label }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.sessions !== undefined && { sessions: data.sessions }),
      ...(data.dept !== undefined && { dept: data.dept }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
  });
}

export async function deletePackage(ctx: ServerContext, id: string) {
  await requireModule("admin");
  return prisma.package.delete({
    where: { id, branchId: ctx.branchId },
  });
}

export async function getPackageById(ctx: ServerContext, id: string) {
  await requireModule("admin");
  return prisma.package.findUnique({
    where: { id, branchId: ctx.branchId },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
  });
}

export async function getPackagesByDepartment(
  ctx: ServerContext,
  dept: string,
) {
  await requireModule("admin");
  return prisma.package.findMany({
    where: { branchId: ctx.branchId, dept, active: true },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: { amount: "asc" },
  });
}
