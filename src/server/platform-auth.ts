"use server";

import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { ServerActionError } from "@/server/errors";

const DEMO_ORG_PASSWORD = "demo";

export type TenantValidationResult =
  | { ok: true; tenantId: string; tenantName: string; slug: string }
  | { ok: false; error: string };

export async function validateTenantAction(
  slug: string,
  orgPassword: string,
): Promise<TenantValidationResult> {
  const normalized = slug.trim().toLowerCase();
  const pwd = orgPassword.trim();
  if (!normalized || !pwd) {
    return { ok: false, error: "Enter organization ID and password." };
  }

  const tenant = await db.tenant.findFirst({
    where: { slug: normalized, active: true },
  });

  if (!tenant) {
    return { ok: false, error: "Organization not found or inactive." };
  }

  const settings = (tenant.settings ?? {}) as { orgPasswordHash?: string };
  let valid = false;

  if (settings.orgPasswordHash) {
    valid = await compare(pwd, settings.orgPasswordHash);
  } else {
    // Demo fallback — seed tenants use "demo"
    valid = pwd === DEMO_ORG_PASSWORD;
  }

  if (!valid) {
    return { ok: false, error: "Incorrect organization password." };
  }

  return {
    ok: true,
    tenantId: tenant.slug,
    tenantName: tenant.name,
    slug: tenant.slug,
  };
}

export type BranchOption = { id: string; name: string; code: string; city?: string | null };

export async function listTenantBranchesAction(tenantSlug: string): Promise<BranchOption[]> {
  const tenant = await db.tenant.findFirst({ where: { slug: tenantSlug.trim().toLowerCase() } });
  if (!tenant) return [];

  const branches = await db.branch.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: "asc" },
  });

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
  }));
}

export async function finalizeWorkspaceSessionAction(input: {
  branchId: string;
  branchName: string;
}) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.email) {
    throw new ServerActionError("UNAUTHORIZED", "Sign in first.");
  }

  const branch = await db.branch.findFirst({
    where: { id: input.branchId, active: true },
  });
  if (!branch) {
    throw new ServerActionError("NOT_FOUND", "Branch not found.");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { branchId: branch.id },
  });

  return {
    branchId: branch.id,
    branchName: branch.name,
    role: session.user.role,
  };
}

/** Hash org password for tenant settings (admin use) */
export async function hashOrgPassword(password: string) {
  return hash(password.trim(), 10);
}
