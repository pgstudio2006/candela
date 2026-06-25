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
import { serializeForClient } from "@/server/serialize";
import type { AdminSnapshot } from "@/server/admin/index";

export type { AdminSnapshot };

async function loadAdminCore() {
  return import("@/server/admin/index");
}

async function withSnapshot(
  fn: (
    ctx: Awaited<ReturnType<typeof resolveAdminOperator>>["ctx"],
    operator: Awaited<ReturnType<typeof resolveAdminOperator>>["operator"],
  ) => Promise<AdminSnapshot>,
): Promise<AdminSnapshot> {
  const { ctx, operator } = await resolveAdminOperator();
  const snapshot = await fn(ctx, operator);
  return serializeForClient(snapshot);
}

export async function getAdminSnapshot(): Promise<ActionResult<AdminSnapshot>> {
  return runAction(async () => {
    const { ctx, operator } = await resolveAdminOperator();
    const { getAdminSnapshotForContext } = await loadAdminCore();
    return getAdminSnapshotForContext(ctx, operator);
  });
}

export async function listAdminAuditLogsAction(input?: { limit?: number; cursor?: string }) {
  const { ctx } = await resolveAdminOperator();
  const { listAdminPlatformAuditLogs } = await loadAdminCore();
  return listAdminPlatformAuditLogs(ctx, input ?? {});
}

export async function updateStaff(id: string, patch: Partial<StaffMember>) {
  const { updateStaff: updateStaffCore } = await loadAdminCore();
  return withSnapshot((ctx, operator) => updateStaffCore(ctx, operator, id, patch));
}

export async function addStaff(input: Omit<StaffMember, "id">) {
  const { addStaff: addStaffCore } = await loadAdminCore();
  return withSnapshot((ctx, operator) => addStaffCore(ctx, operator, input));
}

export async function removeStaff(id: string) {
  const { removeStaff: removeStaffCore } = await loadAdminCore();
  return withSnapshot((ctx, operator) => removeStaffCore(ctx, operator, id));
}

export async function updateDepartment(id: string, patch: Partial<DepartmentConfig>) {
  const { updateDepartment: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id, patch));
}

export async function addDepartment(input: Omit<DepartmentConfig, "id">) {
  const { addDepartment: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function removeDepartment(id: string) {
  const { removeDepartment: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id));
}

export async function updateDiseaseNode(id: string, patch: Partial<DiseaseMapNode>) {
  const { updateDiseaseNode: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id, patch));
}

export async function addDiseaseNode(input: Omit<DiseaseMapNode, "id">) {
  const { addDiseaseNode: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function removeDiseaseNode(id: string) {
  const { removeDiseaseNode: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id));
}

export async function addExpense(input: Omit<ExpenseEntry, "id">) {
  const { addExpense: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function approveExpense(id: string, approved: boolean) {
  const { approveExpense: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id, approved));
}

export async function updateRevenuePolicy(id: string, patch: Partial<RevenueSharePolicy>) {
  const { updateRevenuePolicy: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id, patch));
}

export async function addRevenuePolicy(input: Omit<RevenueSharePolicy, "id">) {
  const { addRevenuePolicy: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function updateMrdStatus(id: string, status: MrdRequest["status"]) {
  const { updateMrdStatus: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, id, status));
}

export async function addMrdRequest(input: Omit<MrdRequest, "id" | "requestedAt" | "status">) {
  const { addMrdRequest: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function runMisReport(id: string) {
  const { runMisReport: core } = await loadAdminCore();
  const { ctx, operator } = await resolveAdminOperator();
  const result = await core(ctx, operator, id);
  return {
    ...result,
    snapshot: serializeForClient(result.snapshot),
  };
}

export async function updateAdminSettings(patch: Partial<AdminPlatformSettings>) {
  const { updateAdminSettings: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, patch));
}

export async function resolveLeakageFlag(flagId: string) {
  const { resolveLeakageFlag: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, flagId));
}

export async function logAdminAction(summary: string) {
  const { logAdminAction: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, summary));
}

export async function saveFormSchemaOverride(schema: FormSchema) {
  const { ctx, operator } = await resolveAdminOperator();
  const { saveFormSchemaOverride: core } = await loadAdminCore();
  await core(ctx, operator, schema);
}

export async function getFormSchemaOverride(schemaId: string) {
  const { ctx } = await resolveAdminOperator();
  const { getFormSchemaOverride: core } = await loadAdminCore();
  return core(ctx, schemaId);
}

export async function resetFormSchemaOverride(schemaId: string) {
  const { ctx, operator } = await resolveAdminOperator();
  const { resetFormSchemaOverride: core } = await loadAdminCore();
  await core(ctx, operator, schemaId);
}

export async function listFormSchemaOverrides() {
  const { ctx } = await resolveAdminOperator();
  const { listFormSchemaOverrides: core } = await loadAdminCore();
  return core(ctx);
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
  const { saveDocumentTemplate: core } = await loadAdminCore();
  return withSnapshot((ctx, operator) => core(ctx, operator, input));
}

export async function exportRevenueShareCsvAction(
  policyId: string,
  doctorName: string,
  gross: number,
  share: number,
  packagesClosed: number,
) {
  const { ctx, operator } = await resolveAdminOperator();
  const { exportRevenueShareCsv: core } = await loadAdminCore();
  return core(ctx, operator, policyId, doctorName, gross, share, packagesClosed);
}

export async function searchAdminPatientsAction(input: {
  q?: string;
  page?: number;
  pageSize?: number;
  view?: "all" | "balance" | "today";
}) {
  return runAction(async () => {
    const { ctx } = await resolveAdminOperator();
    const { searchAdminPatients } = await import("@/server/admin/patients");
    return searchAdminPatients(ctx, input);
  });
}

export async function getAdminPatientHistoryAction(patientId: string) {
  return runAction(async () => {
    const { ctx } = await resolveAdminOperator();
    const { getAdminPatientHistory } = await import("@/server/admin/patients");
    return serializeForClient(await getAdminPatientHistory(ctx, patientId));
  });
}

export async function deleteAdminPatientAction(patientId: string) {
  return runAction(async () => {
    const { ctx, operator } = await resolveAdminOperator();
    const { deleteAdminPatient } = await import("@/server/admin/patients");
    const result = await deleteAdminPatient(ctx, operator, patientId);
    return result;
  });
}
