"use server";

import type { AdminPlatformSettings } from "@/design-system/admin-data";
import { resolveAdminOperator } from "@/server/module-operator";
import { updateAdminSettings as updateAdminSettingsCore } from "@/server/admin/index";

export async function updateAdminSettingsAction(patch: Partial<AdminPlatformSettings>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateAdminSettingsCore(ctx, operator, patch);
}
