"use server";

import type { AdminPlatformSettings } from "@/design-system/admin-data";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { updateAdminSettings as updateAdminSettingsCore } from "@/server/admin/index";

export async function updateAdminSettingsAction(patch: Partial<AdminPlatformSettings>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateAdminSettingsCore(ctx, operator, patch);
}

export async function createStaffWithLoginAction(input: {
  staff: Omit<import("@/design-system/admin-data").StaffMember, "id">;
  moduleRole?: string;
  password?: string;
}) {
  const { ctx, operator } = await resolveAdminOperator();
  const { assertConfigAccess } = await import("@/server/admin/guards");
  assertConfigAccess(operator);
  const { addStaffWithLogin } = await import("@/server/admin/staff-onboarding");
  const result = await addStaffWithLogin(ctx, input);
  return {
    ...result,
    snapshot: await getAdminSnapshotForContext(ctx, operator),
  };
}
