"use server";

import type { AdminPlatformSettings } from "@/design-system/admin-data";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminSnapshotForContext } from "@/server/admin/index";
import { updateAdminSettings as updateAdminSettingsCore } from "@/server/admin/index";
import { runAction, type ActionResult } from "@/server/action-result";
import type { AdminSnapshot } from "@/server/admin/actions";

export async function updateAdminSettingsAction(patch: Partial<AdminPlatformSettings>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateAdminSettingsCore(ctx, operator, patch);
}

type StaffOnboardResult = {
  staffId: string;
  doctorId?: string;
  loginEmail: string;
  initialPassword?: string;
  snapshot: AdminSnapshot;
};

export async function createStaffWithLoginAction(input: {
  staff: Omit<import("@/design-system/admin-data").StaffMember, "id">;
  moduleRole?: string;
  password?: string;
}): Promise<ActionResult<StaffOnboardResult>> {
  return runAction(async () => {
    const { ctx, operator } = await resolveAdminOperator();
    const { assertConfigAccess } = await import("@/server/admin/guards");
    assertConfigAccess(operator);
    const { addStaffWithLogin } = await import("@/server/admin/staff-onboarding");
    const result = await addStaffWithLogin(ctx, input);
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return { ...result, snapshot };
  });
}

export async function resetStaffPasswordAction(
  staffId: string,
  password?: string,
): Promise<ActionResult<{ loginEmail: string; initialPassword: string; snapshot: AdminSnapshot }>> {
  return runAction(async () => {
    const { ctx, operator } = await resolveAdminOperator();
    const { assertConfigAccess } = await import("@/server/admin/guards");
    assertConfigAccess(operator);
    const { resetStaffLoginPassword } = await import("@/server/admin/staff-onboarding");
    const result = await resetStaffLoginPassword(ctx, staffId, password);
    const snapshot = await getAdminSnapshotForContext(ctx, operator);
    return { ...result, snapshot };
  });
}
