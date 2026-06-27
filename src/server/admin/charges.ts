import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/auth";
import type { ServerContext } from "@/server/context";

export type ServiceChargeInput = {
  label: string;
  category: string;
  description?: string;
  rate: number;
  unit?: string;
  gstPercent?: number;
  hsnCode?: string;
  active?: boolean;
};

export async function getServiceCharges(ctx: ServerContext) {
  await requireModule("admin");
  return prisma.serviceCharge.findMany({
    where: { branchId: ctx.branchId },
    orderBy: { category: "asc" },
  });
}

export async function createServiceCharge(
  ctx: ServerContext,
  data: ServiceChargeInput,
) {
  await requireModule("admin");
  return prisma.serviceCharge.create({
    data: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      label: data.label,
      category: data.category,
      description: data.description,
      rate: data.rate,
      unit: data.unit,
      gstPercent: data.gstPercent ?? 18,
      hsnCode: data.hsnCode,
      active: data.active ?? true,
    },
  });
}

export async function updateServiceCharge(
  ctx: ServerContext,
  id: string,
  data: Partial<ServiceChargeInput>,
) {
  await requireModule("admin");
  return prisma.serviceCharge.update({
    where: { id, branchId: ctx.branchId },
    data,
  });
}

export async function deleteServiceCharge(ctx: ServerContext, id: string) {
  await requireModule("admin");
  return prisma.serviceCharge.delete({
    where: { id, branchId: ctx.branchId },
  });
}

export async function getServiceChargesByCategory(
  ctx: ServerContext,
  category: string,
) {
  await requireModule("admin");
  return prisma.serviceCharge.findMany({
    where: { branchId: ctx.branchId, category, active: true },
    orderBy: { label: "asc" },
  });
}
