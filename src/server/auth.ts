import type { CandelaRole } from "@/design-system/modules";
import { getServerContext, type ServerContext } from "@/server/context";
import { canAccessModule, requirePermission } from "@/server/permissions";
import { ServerActionError } from "@/server/errors";

/** Module access — admin no longer bypasses; uses RolePermission table */
export async function requireAuth(): Promise<ServerContext> {
  return getServerContext();
}

export async function requireModule(module: CandelaRole): Promise<ServerContext> {
  const ctx = await getServerContext();

  if (ctx.role === module) return ctx;

  const allowed = await canAccessModule(ctx, module);
  if (!allowed) {
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

export async function requireAnyModule(...modules: CandelaRole[]): Promise<ServerContext> {
  const ctx = await getServerContext();
  for (const module of modules) {
    if (ctx.role === module) return ctx;
    if (await canAccessModule(ctx, module)) return ctx;
  }
  throw new ServerActionError("FORBIDDEN", "You do not have permission for this action.");
}

export async function requireModulePermission(
  module: CandelaRole,
  permissionKey: string,
): Promise<ServerContext> {
  const ctx = await requireModule(module);
  await requirePermission(ctx, permissionKey);
  return ctx;
}

export function actorFromContext(ctx: ServerContext, fallback = "system"): string {
  return ctx.userId || fallback;
}
