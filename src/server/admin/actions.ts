"use server";

import type {
  AdminPlatformSettings,
  DepartmentConfig,
  DiseaseMapNode,
  ExpenseEntry,
  MrdRequest,
  RevenueSharePolicy,
  StaffMember,
} from "@/design-system/admin-data";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { resolveAdminOperator } from "@/server/module-operator";
import { runAction, type ActionResult } from "@/server/action-result";
import {
  addDepartment as addDepartmentCore,
  addDiseaseNode as addDiseaseNodeCore,
  addExpense as addExpenseCore,
  addMrdRequest as addMrdRequestCore,
  addRevenuePolicy as addRevenuePolicyCore,
  addStaff as addStaffCore,
  approveExpense as approveExpenseCore,
  exportRevenueShareCsv as exportRevenueShareCsvCore,
  getAdminSnapshotForContext,
  getFormSchemaOverride as getFormSchemaOverrideCore,
  listAdminPlatformAuditLogs,
  listFormSchemaOverrides as listFormSchemaOverridesCore,
  logAdminAction as logAdminActionCore,
  removeDepartment as removeDepartmentCore,
  removeDiseaseNode as removeDiseaseNodeCore,
  removeStaff as removeStaffCore,
  resetFormSchemaOverride as resetFormSchemaOverrideCore,
  resolveLeakageFlag as resolveLeakageFlagCore,
  runMisReport as runMisReportCore,
  saveDocumentTemplate as saveDocumentTemplateCore,
  saveFormSchemaOverride as saveFormSchemaOverrideCore,
  updateAdminSettings as updateAdminSettingsCore,
  updateDepartment as updateDepartmentCore,
  updateDiseaseNode as updateDiseaseNodeCore,
  updateMrdStatus as updateMrdStatusCore,
  updateRevenuePolicy as updateRevenuePolicyCore,
  updateStaff as updateStaffCore,
  type AdminSnapshot,
} from "@/server/admin/index";

export type { AdminSnapshot };

export async function getAdminSnapshot(): Promise<ActionResult<AdminSnapshot>> {
  return runAction(async () => {
    const { ctx, operator } = await resolveAdminOperator();
    return getAdminSnapshotForContext(ctx, operator);
  });
}

export async function listAdminAuditLogsAction(input?: { limit?: number; cursor?: string }) {
  const { ctx } = await resolveAdminOperator();
  return listAdminPlatformAuditLogs(ctx, input ?? {});
}

export async function updateStaff(id: string, patch: Partial<StaffMember>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateStaffCore(ctx, operator, id, patch);
}

export async function addStaff(input: Omit<StaffMember, "id">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addStaffCore(ctx, operator, input);
}

export async function createStaffWithLoginAction(input: {
  staff: Omit<StaffMember, "id">;
  moduleRole?: string;
  password?: string;
}): Promise<
  ActionResult<{
    staffId: string;
    doctorId?: string;
    loginEmail: string;
    initialPassword?: string;
    snapshot: AdminSnapshot;
  }>
> {
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

export async function removeStaff(id: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return removeStaffCore(ctx, operator, id);
}

export async function updateDepartment(id: string, patch: Partial<DepartmentConfig>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateDepartmentCore(ctx, operator, id, patch);
}

export async function addDepartment(input: Omit<DepartmentConfig, "id">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addDepartmentCore(ctx, operator, input);
}

export async function removeDepartment(id: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return removeDepartmentCore(ctx, operator, id);
}

export async function updateDiseaseNode(id: string, patch: Partial<DiseaseMapNode>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateDiseaseNodeCore(ctx, operator, id, patch);
}

export async function addDiseaseNode(input: Omit<DiseaseMapNode, "id">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addDiseaseNodeCore(ctx, operator, input);
}

export async function removeDiseaseNode(id: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return removeDiseaseNodeCore(ctx, operator, id);
}

export async function addExpense(input: Omit<ExpenseEntry, "id">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addExpenseCore(ctx, operator, input);
}

export async function approveExpense(id: string, approved: boolean) {
  const { ctx, operator } = await resolveAdminOperator();
  return approveExpenseCore(ctx, operator, id, approved);
}

export async function updateRevenuePolicy(id: string, patch: Partial<RevenueSharePolicy>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateRevenuePolicyCore(ctx, operator, id, patch);
}

export async function addRevenuePolicy(input: Omit<RevenueSharePolicy, "id">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addRevenuePolicyCore(ctx, operator, input);
}

export async function updateMrdStatus(id: string, status: MrdRequest["status"]) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateMrdStatusCore(ctx, operator, id, status);
}

export async function addMrdRequest(input: Omit<MrdRequest, "id" | "requestedAt" | "status">) {
  const { ctx, operator } = await resolveAdminOperator();
  return addMrdRequestCore(ctx, operator, input);
}

export async function runMisReport(id: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return runMisReportCore(ctx, operator, id);
}

export async function updateAdminSettings(patch: Partial<AdminPlatformSettings>) {
  const { ctx, operator } = await resolveAdminOperator();
  return updateAdminSettingsCore(ctx, operator, patch);
}

export async function resolveLeakageFlag(flagId: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return resolveLeakageFlagCore(ctx, operator, flagId);
}

export async function logAdminAction(summary: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return logAdminActionCore(ctx, operator, summary);
}

export async function saveFormSchemaOverride(schema: FormSchema) {
  const { ctx, operator } = await resolveAdminOperator();
  return saveFormSchemaOverrideCore(ctx, operator, schema);
}

export async function getFormSchemaOverride(schemaId: string) {
  const { ctx } = await resolveAdminOperator();
  return getFormSchemaOverrideCore(ctx, schemaId);
}

export async function resetFormSchemaOverride(schemaId: string) {
  const { ctx, operator } = await resolveAdminOperator();
  return resetFormSchemaOverrideCore(ctx, operator, schemaId);
}

export async function listFormSchemaOverrides() {
  const { ctx } = await resolveAdminOperator();
  return listFormSchemaOverridesCore(ctx);
}

export async function saveDocumentTemplate(
  input: {
    id?: string;
    kind: string;
    label: string;
    layout: string;
    description?: string;
    enabled?: boolean;
  },
) {
  const { ctx, operator } = await resolveAdminOperator();
  return saveDocumentTemplateCore(ctx, operator, input);
}

export async function exportRevenueShareCsvAction(
  policyId: string,
  doctorName: string,
  gross: number,
  share: number,
  packagesClosed: number,
) {
  const { ctx, operator } = await resolveAdminOperator();
  return exportRevenueShareCsvCore(ctx, operator, policyId, doctorName, gross, share, packagesClosed);
}
