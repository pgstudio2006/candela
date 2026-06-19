"use server";

import { updateAdminSettings } from "@/server/admin/actions";
import { requireModule } from "@/server/auth";
import type { AdminPlatformSettings } from "@/design-system/admin-data";

export async function updateAdminSettingsAction(patch: Partial<AdminPlatformSettings>) {
  const ctx = await requireModule("admin");
  return updateAdminSettings(patch, ctx.userId);
}

export async function createStaffWithLoginAction(input: {
  staff: Omit<import("@/design-system/admin-data").StaffMember, "id">;
  moduleRole?: string;
  password?: string;
}) {
  const ctx = await requireModule("admin");
  const { addStaffWithLogin } = await import("@/server/admin/staff-onboarding");
  return addStaffWithLogin(ctx, input);
}
