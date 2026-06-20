import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";

export function workspaceStateId(ctx: Pick<ServerContext, "tenantId" | "branchId">): string {
  return `${ctx.tenantId}_${ctx.branchId}`;
}

async function migrateLegacyRow<T>(
  table: "crm" | "pharmacy" | "counsellor",
  scopedId: string,
  fallback: () => T,
): Promise<T> {
  const readLegacy = async () => {
    if (table === "crm") {
      return prisma.crmWorkspaceState.findUnique({ where: { id: "default" } });
    }
    if (table === "pharmacy") {
      return prisma.pharmacyWorkspaceState.findUnique({ where: { id: "default" } });
    }
    return prisma.counsellorWorkspaceState.findUnique({ where: { id: "default" } });
  };

  const readScoped = async () => {
    if (table === "crm") {
      return prisma.crmWorkspaceState.findUnique({ where: { id: scopedId } });
    }
    if (table === "pharmacy") {
      return prisma.pharmacyWorkspaceState.findUnique({ where: { id: scopedId } });
    }
    return prisma.counsellorWorkspaceState.findUnique({ where: { id: scopedId } });
  };

  const writeScoped = async (payload: Prisma.InputJsonValue) => {
    if (table === "crm") {
      return prisma.crmWorkspaceState.upsert({
        where: { id: scopedId },
        create: { id: scopedId, payload },
        update: {},
      });
    }
    if (table === "pharmacy") {
      return prisma.pharmacyWorkspaceState.upsert({
        where: { id: scopedId },
        create: { id: scopedId, payload },
        update: {},
      });
    }
    return prisma.counsellorWorkspaceState.upsert({
      where: { id: scopedId },
      create: { id: scopedId, payload },
      update: {},
    });
  };

  const createScoped = async (payload: Prisma.InputJsonValue) => {
    if (table === "crm") {
      return prisma.crmWorkspaceState.create({ data: { id: scopedId, payload } });
    }
    if (table === "pharmacy") {
      return prisma.pharmacyWorkspaceState.create({ data: { id: scopedId, payload } });
    }
    return prisma.counsellorWorkspaceState.create({ data: { id: scopedId, payload } });
  };

  let row = await readScoped();
  if (!row) {
    const legacy = await readLegacy();
    if (legacy) {
      row = await writeScoped(legacy.payload as Prisma.InputJsonValue);
    }
  }
  if (!row) {
    row = await createScoped(fallback() as Prisma.InputJsonValue);
  }
  return row.payload as T;
}

export async function readCrmWorkspace<T>(ctx: ServerContext, fallback: () => T): Promise<T> {
  return migrateLegacyRow("crm", workspaceStateId(ctx), fallback);
}

export async function writeCrmWorkspace<T>(ctx: ServerContext, payload: T): Promise<void> {
  const scopedId = workspaceStateId(ctx);
  await prisma.crmWorkspaceState.upsert({
    where: { id: scopedId },
    create: { id: scopedId, payload: payload as Prisma.InputJsonValue },
    update: { payload: payload as Prisma.InputJsonValue },
  });
}

export async function readPharmacyWorkspace<T>(ctx: ServerContext, fallback: () => T): Promise<T> {
  return migrateLegacyRow("pharmacy", workspaceStateId(ctx), fallback);
}

export async function writePharmacyWorkspace<T>(ctx: ServerContext, payload: T): Promise<void> {
  const scopedId = workspaceStateId(ctx);
  await prisma.pharmacyWorkspaceState.upsert({
    where: { id: scopedId },
    create: { id: scopedId, payload: payload as Prisma.InputJsonValue },
    update: { payload: payload as Prisma.InputJsonValue },
  });
}

export async function readCounsellorWorkspace<T>(ctx: ServerContext, fallback: () => T): Promise<T> {
  return migrateLegacyRow("counsellor", workspaceStateId(ctx), fallback);
}

export async function writeCounsellorWorkspace<T>(ctx: ServerContext, payload: T): Promise<void> {
  const scopedId = workspaceStateId(ctx);
  await prisma.counsellorWorkspaceState.upsert({
    where: { id: scopedId },
    create: { id: scopedId, payload: payload as Prisma.InputJsonValue },
    update: { payload: payload as Prisma.InputJsonValue },
  });
}
