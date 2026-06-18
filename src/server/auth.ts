import type { CandelaRole } from "@/design-system/modules";
import { getServerContext, type ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";

const MODULE_ROLES: Record<string, CandelaRole[]> = {
  frontdesk: ["frontdesk", "admin"],
  doctor: ["doctor", "admin"],
  nurse: ["nurse", "admin"],
  pharmacy: ["pharmacy", "admin"],
  counsellor: ["counsellor", "admin"],
  crm: ["crm", "admin"],
  hr: ["hr", "admin"],
  admin: ["admin"],
};

export async function requireAuth(): Promise<ServerContext> {
  return getServerContext();
}

export async function requireModule(module: keyof typeof MODULE_ROLES): Promise<ServerContext> {
  const ctx = await getServerContext();
  const allowed = MODULE_ROLES[module] ?? [module];
  if (!allowed.includes(ctx.role as CandelaRole)) {
    throw new ServerActionError(
      "FORBIDDEN",
      `This action requires ${module} workspace access.`,
    );
  }
  return ctx;
}

export async function requireRoles(...roles: CandelaRole[]): Promise<ServerContext> {
  const ctx = await getServerContext();
  if (!roles.includes(ctx.role as CandelaRole)) {
    throw new ServerActionError("FORBIDDEN", "You do not have permission for this action.");
  }
  return ctx;
}

export async function requireAnyModule(...modules: Array<keyof typeof MODULE_ROLES>): Promise<ServerContext> {
  const ctx = await getServerContext();
  for (const module of modules) {
    const allowed = MODULE_ROLES[module] ?? [module];
    if (allowed.includes(ctx.role as CandelaRole)) return ctx;
  }
  throw new ServerActionError("FORBIDDEN", "You do not have permission for this action.");
}

export function actorFromContext(ctx: ServerContext, fallback = "system"): string {
  return ctx.userId || fallback;
}
