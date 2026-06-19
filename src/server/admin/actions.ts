// @ts-nocheck
"use server";

import { prisma } from "@/lib/prisma";
import type {
  AdminPlatformSettings,
  DepartmentConfig,
  DiseaseCluster,
  DiseaseMapNode,
  ExpenseEntry,
  GeoCluster,
  MisReport,
  MrdRequest,
  RevenueSharePolicy,
  StaffMember,
} from "@/design-system/admin-data";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import { syncDoctorToDepartments } from "@/server/admin/staff-onboarding";
import { writeAuditLog } from "@/server/audit-log";
import { requireModule } from "@/server/auth";
import { ADMIN_SETTINGS_ID, ensureBootstrapData } from "@/server/bootstrap";
import {
  computeDataMiningSnapshot,
  computeLiveDiseaseClusters,
  computeLiveGeoClusters,
  type DataMiningSnapshot,
} from "@/lib/admin-analytics";

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  actorRole: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  severity: "info" | "warning" | "critical";
};

export type AdminSnapshot = {
  staff: StaffMember[];
  departments: DepartmentConfig[];
  diseaseMap: DiseaseMapNode[];
  diseaseClusters: DiseaseCluster[];
  geo: GeoCluster[];
  expenses: ExpenseEntry[];
  revenuePolicies: RevenueSharePolicy[];
  mrdRequests: MrdRequest[];
  misReports: MisReport[];
  settings: AdminPlatformSettings;
  resolvedLeakageIds: string[];
  auditEvents: AuditEvent[];
  patients: Patient[];
  visits: Visit[];
  dataMining: DataMiningSnapshot;
  documentTemplates: { id: string; label: string; kind: string; layout: string }[];
};

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toAudit(events: Awaited<ReturnType<typeof prisma.adminAuditLog.findMany>>): AuditEvent[] {
  return events.map((x) => ({
    ...x,
    severity: x.severity as AuditEvent["severity"],
  }));
}

async function getSnapshot(): Promise<AdminSnapshot> {
  await requireModule("admin");
  await ensureBootstrapData();
  const [
    staff,
    departments,
    diseaseMap,
    diseaseClusters,
    geo,
    expenses,
    revenuePolicies,
    mrdRequests,
    misReports,
    settings,
    auditEvents,
    patients,
    visits,
    documentTemplates,
    formSubmissions,
    consultations,
  ] = await Promise.all([
    prisma.adminStaff.findMany({ orderBy: { name: "asc" } }),
    prisma.adminDepartment.findMany({ orderBy: { label: "asc" } }),
    prisma.adminDiseaseNode.findMany({ orderBy: { label: "asc" } }),
    prisma.adminDiseaseCluster.findMany({ orderBy: { caseCount: "desc" } }),
    prisma.adminGeoPin.findMany({ orderBy: { patientCount: "desc" } }),
    prisma.adminExpense.findMany({ orderBy: { date: "desc" } }),
    prisma.adminRevenuePolicy.findMany({ orderBy: { label: "asc" } }),
    prisma.adminMrdRequest.findMany({ orderBy: { requestedAt: "desc" } }),
    prisma.adminMisReport.findMany({ orderBy: { label: "asc" } }),
    prisma.adminSetting.upsert({
      where: { id: ADMIN_SETTINGS_ID },
      update: {},
      create: {
        id: ADMIN_SETTINGS_ID,
        kAnonymityMin: 5,
        geoAggregateOnly: true,
        auditRetentionYears: 7,
        outbreakAlerts: true,
        autoMisDaily: true,
        whatsappConsentFlag: false,
        resolvedLeakageIds: [],
      },
    }),
    prisma.adminAuditLog.findMany({ orderBy: { at: "desc" }, take: 300 }),
    prisma.patient.findMany({ orderBy: { name: "asc" } }),
    prisma.opdVisit.findMany({ orderBy: { checkInAt: "desc" } }),
    prisma.documentTemplate.findMany({ where: { kind: { startsWith: "admin:" } } }),
    prisma.formSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
    prisma.consultation.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const mappedPatients: Patient[] = patients.map((x) => ({
    ...x,
    tags: parseArray<string>(x.tags),
    balance: Number(x.balance),
  }));
  const mappedVisits: Visit[] = visits.map((x) => ({
    ...x,
    billAmount: x.billAmount === null ? undefined : Number(x.billAmount),
    amountPaid: x.amountPaid === null ? undefined : Number(x.amountPaid),
    balanceDue: x.balanceDue === null ? undefined : Number(x.balanceDue),
  }));
  const mappedDiseaseMap = diseaseMap.map((x) => ({
    ...x,
    packageIds: parseArray<string>(x.packageIds),
    consentTemplateIds: parseArray<string>(x.consentTemplateIds),
  }));
  const baseGeo: GeoCluster[] = geo.map((x) => ({
    ...x,
    patientCount: Number(x.patientCount),
    opdCount: Number(x.opdCount),
    ipdCount: Number(x.ipdCount),
    revenue: Number(x.revenue),
    severity: (x.severity as GeoCluster["severity"]) ?? undefined,
  }));
  const submissionRows = formSubmissions.map((row) => ({
    patientId: row.patientId,
    visitId: row.visitId,
    data: (row.data ?? {}) as Record<string, string | number | boolean>,
  }));
  const consultationRows = consultations.map((row) => ({
    patientId: row.patientId,
    status: row.status,
    completedAt: row.completedAt,
    diagnosis: (row.diagnosis ?? {}) as Record<string, string | number | boolean>,
  }));

  const liveGeo = computeLiveGeoClusters(
    baseGeo,
    mappedPatients,
    mappedVisits,
    submissionRows,
    consultationRows,
    mappedDiseaseMap,
  );
  const liveDiseaseClusters = computeLiveDiseaseClusters(
    liveGeo,
    consultationRows,
    mappedDiseaseMap,
  );
  const dataMining = computeDataMiningSnapshot(
    mappedPatients,
    mappedVisits,
    consultationRows,
    submissionRows.filter((s) => s.data),
    mappedDiseaseMap,
  );

  return {
    staff: staff.map((x) => ({
      ...x,
      departmentIds: parseArray<string>(x.departmentIds),
    })),
    departments: departments.map((x) => ({
      ...x,
      doctorIds: parseArray<string>(x.doctorIds),
      defaultPackageIds: parseArray<string>(x.defaultPackageIds),
      bays: parseArray<string>(x.bays),
    })),
    diseaseMap: diseaseMap.map((x) => ({
      ...x,
      packageIds: parseArray<string>(x.packageIds),
      consentTemplateIds: parseArray<string>(x.consentTemplateIds),
    })),
    diseaseClusters: liveDiseaseClusters.length ? liveDiseaseClusters : diseaseClusters,
    geo: liveGeo,
    expenses: expenses.map((x) => ({ ...x, amount: Number(x.amount) })),
    revenuePolicies: revenuePolicies.map((x) => ({
      ...x,
      opdConsultPercent: Number(x.opdConsultPercent),
      packageNetPercent: Number(x.packageNetPercent),
      ipdDayFixed: Number(x.ipdDayFixed),
    })),
    mrdRequests: mrdRequests.map((x) => ({
      ...x,
      documents: parseArray<string>(x.documents),
    })),
    misReports,
    settings: {
      kAnonymityMin: settings.kAnonymityMin,
      geoAggregateOnly: settings.geoAggregateOnly,
      auditRetentionYears: settings.auditRetentionYears,
      outbreakAlerts: settings.outbreakAlerts,
      autoMisDaily: settings.autoMisDaily,
      whatsappConsentFlag: settings.whatsappConsentFlag,
    },
    resolvedLeakageIds: parseArray<string>(settings.resolvedLeakageIds),
    auditEvents: toAudit(auditEvents),
    patients: mappedPatients,
    visits: mappedVisits,
    dataMining,
    documentTemplates: documentTemplates.map((x) => ({
      id: x.id,
      label: x.label,
      kind: x.kind,
      layout: x.layout,
    })),
  };
}

async function auditedMutation(
  op: () => Promise<void>,
  audit: Parameters<typeof writeAuditLog>[0],
) {
  await requireModule("admin");
  await op();
  await writeAuditLog(audit);
  return getSnapshot();
}

export async function getAdminSnapshot() {
  return getSnapshot();
}

export async function updateStaff(id: string, patch: Partial<StaffMember>, actor = "admin") {
  return auditedMutation(
    async () => {
      const existing = await prisma.adminStaff.findUnique({ where: { id } });
      await prisma.adminStaff.update({
        where: { id },
        data: patch,
      });
      const role = patch.role ?? existing?.role;
      const departmentIds = patch.departmentIds ?? (existing?.departmentIds as string[] | undefined);
      if (role === "doctor" && departmentIds?.length) {
        await syncDoctorToDepartments(id, departmentIds);
      }
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "staff_updated",
      entityType: "staff",
      entityId: id,
      summary: `Staff updated: ${id}`,
      payload: patch,
    },
  );
}

export async function addStaff(input: Omit<StaffMember, "id">, actor = "admin") {
  const newId = id("st");
  return auditedMutation(
    async () => {
      await prisma.adminStaff.create({
        data: {
          id: newId,
          ...input,
        },
      });
      if (input.role === "doctor" && input.departmentIds?.length) {
        await syncDoctorToDepartments(newId, input.departmentIds);
      }
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "staff_added",
      entityType: "staff",
      entityId: newId,
      summary: `Staff added: ${input.name}`,
    },
  );
}

export async function removeStaff(idValue: string, actor = "admin") {
  return auditedMutation(
    async () => {
      await prisma.adminStaff.delete({ where: { id: idValue } });
      const deps = await prisma.adminDepartment.findMany();
      for (const dept of deps) {
        const head = dept.headStaffId === idValue ? null : dept.headStaffId;
        await prisma.adminDepartment.update({
          where: { id: dept.id },
          data: { headStaffId: head },
        });
      }
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "staff_removed",
      entityType: "staff",
      entityId: idValue,
      summary: `Staff removed: ${idValue}`,
      severity: "warning",
    },
  );
}

export async function updateDepartment(
  idValue: string,
  patch: Partial<DepartmentConfig>,
  actor = "admin",
) {
  return auditedMutation(
    async () => {
      await prisma.adminDepartment.update({
        where: { id: idValue },
        data: patch,
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "department_updated",
      entityType: "department",
      entityId: idValue,
      summary: `Department updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addDepartment(input: Omit<DepartmentConfig, "id">, actor = "admin") {
  const newId = id("dept");
  return auditedMutation(
    async () => {
      await prisma.adminDepartment.create({
        data: {
          id: newId,
          ...input,
        },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "department_added",
      entityType: "department",
      entityId: newId,
      summary: `Department added: ${input.label}`,
    },
  );
}

export async function removeDepartment(idValue: string, actor = "admin") {
  return auditedMutation(
    async () => {
      await prisma.adminDepartment.delete({ where: { id: idValue } });
      const staff = await prisma.adminStaff.findMany();
      for (const member of staff) {
        const departmentIds = parseArray<string>(member.departmentIds).filter((x) => x !== idValue);
        await prisma.adminStaff.update({
          where: { id: member.id },
          data: { departmentIds },
        });
      }
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "department_removed",
      entityType: "department",
      entityId: idValue,
      summary: `Department removed: ${idValue}`,
      severity: "warning",
    },
  );
}

export async function updateDiseaseNode(
  idValue: string,
  patch: Partial<DiseaseMapNode>,
  actor = "admin",
) {
  return auditedMutation(
    async () => {
      await prisma.adminDiseaseNode.update({
        where: { id: idValue },
        data: patch,
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "disease_node_updated",
      entityType: "disease_node",
      entityId: idValue,
      summary: `Disease node updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addDiseaseNode(input: Omit<DiseaseMapNode, "id">, actor = "admin") {
  const newId = id("dm");
  return auditedMutation(
    async () => {
      await prisma.adminDiseaseNode.create({
        data: {
          id: newId,
          ...input,
        },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "disease_node_added",
      entityType: "disease_node",
      entityId: newId,
      summary: `Disease node added: ${input.label}`,
    },
  );
}

export async function removeDiseaseNode(idValue: string, actor = "admin") {
  return auditedMutation(
    async () => {
      await prisma.adminDiseaseNode.delete({ where: { id: idValue } });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "disease_node_removed",
      entityType: "disease_node",
      entityId: idValue,
      summary: `Disease node removed: ${idValue}`,
      severity: "warning",
    },
  );
}

export async function addExpense(input: Omit<ExpenseEntry, "id">, actor = "admin") {
  const newId = id("ex");
  return auditedMutation(
    async () => {
      await prisma.adminExpense.create({
        data: {
          id: newId,
          ...input,
        },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "expense_added",
      entityType: "expense",
      entityId: newId,
      summary: `Expense submitted: ${input.vendor}`,
    },
  );
}

export async function approveExpense(idValue: string, approved: boolean, actor = "admin") {
  return auditedMutation(
    async () => {
      await prisma.adminExpense.update({
        where: { id: idValue },
        data: { status: approved ? "approved" : "rejected" },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "finance",
      action: approved ? "expense_approved" : "expense_rejected",
      entityType: "expense",
      entityId: idValue,
      summary: `${approved ? "Approved" : "Rejected"} expense: ${idValue}`,
      severity: approved ? "info" : "warning",
    },
  );
}

export async function updateRevenuePolicy(
  idValue: string,
  patch: Partial<RevenueSharePolicy>,
  actor = "admin",
) {
  return auditedMutation(
    async () => {
      await prisma.adminRevenuePolicy.update({
        where: { id: idValue },
        data: patch,
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "revenue_policy_updated",
      entityType: "revenue_policy",
      entityId: idValue,
      summary: `Revenue policy updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addRevenuePolicy(input: Omit<RevenueSharePolicy, "id">, actor = "admin") {
  const newId = id("rsp");
  return auditedMutation(
    async () => {
      await prisma.adminRevenuePolicy.create({
        data: {
          id: newId,
          ...input,
        },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "revenue_policy_added",
      entityType: "revenue_policy",
      entityId: newId,
      summary: `Revenue policy added: ${input.label}`,
    },
  );
}

export async function updateMrdStatus(
  idValue: string,
  status: MrdRequest["status"],
  actor = "admin",
) {
  return auditedMutation(
    async () => {
      await prisma.adminMrdRequest.update({
        where: { id: idValue },
        data: { status },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "mrd",
      action: "mrd_status_updated",
      entityType: "mrd_request",
      entityId: idValue,
      summary: `MRD status -> ${status}`,
    },
  );
}

export async function addMrdRequest(
  input: Omit<MrdRequest, "id" | "requestedAt" | "status">,
  actor = "admin",
) {
  const newId = id("mrd");
  return auditedMutation(
    async () => {
      await prisma.adminMrdRequest.create({
        data: {
          id: newId,
          ...input,
          requestedAt: new Date().toISOString(),
          status: "pending",
        },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "mrd",
      action: "mrd_request_added",
      entityType: "mrd_request",
      entityId: newId,
      summary: `MRD request added: ${input.patientName}`,
    },
  );
}

export async function runMisReport(idValue: string, actor = "admin") {
  return auditedMutation(
    async () => {
      const report = await prisma.adminMisReport.findUnique({ where: { id: idValue } });
      const visitCount = await prisma.opdVisit.count();
      const revenue = await prisma.invoice.aggregate({ _sum: { amountPaid: true } });
      const rev = Number(revenue._sum.amountPaid ?? 0);
      const csvPreview = [
        "report,generated_at,active_visits,revenue_collected",
        `${report?.label ?? idValue},${new Date().toISOString()},${visitCount},${rev}`,
      ].join("\n");
      await prisma.adminMisReport.update({
        where: { id: idValue },
        data: { lastRun: new Date().toISOString() },
      });
      await writeAuditLog({
        actor,
        actorRole: "admin",
        module: "mis",
        action: "mis_output",
        entityType: "mis_report",
        entityId: idValue,
        summary: `MIS output generated (${visitCount} visits, ₹${rev})`,
        payload: { csvPreview, visitCount, revenue: rev },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "mis",
      action: "mis_run",
      entityType: "mis_report",
      entityId: idValue,
      summary: `MIS run triggered: ${idValue}`,
    },
  );
}

export async function updateAdminSettings(
  patch: Partial<AdminPlatformSettings>,
  actor = "admin",
) {
  return auditedMutation(
    async () => {
      await prisma.adminSetting.update({
        where: { id: ADMIN_SETTINGS_ID },
        data: patch,
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "admin",
      action: "admin_settings_updated",
      entityType: "settings",
      entityId: ADMIN_SETTINGS_ID,
      summary: "Admin settings updated",
      payload: patch,
    },
  );
}

export async function resolveLeakageFlag(flagId: string, actor = "admin") {
  await ensureBootstrapData();
  const setting = await prisma.adminSetting.findUniqueOrThrow({
    where: { id: ADMIN_SETTINGS_ID },
  });
  const resolved = new Set(parseArray<string>(setting.resolvedLeakageIds));
  resolved.add(flagId);
  return auditedMutation(
    async () => {
      await prisma.adminSetting.update({
        where: { id: ADMIN_SETTINGS_ID },
        data: { resolvedLeakageIds: [...resolved] },
      });
    },
    {
      actor,
      actorRole: "admin",
      module: "rcm",
      action: "leakage_resolved",
      entityType: "leakage_flag",
      entityId: flagId,
      summary: `Leakage flag resolved: ${flagId}`,
    },
  );
}

export async function logAdminAction(summary: string, actor = "Admin User") {
  await ensureBootstrapData();
  await writeAuditLog({
    actor,
    actorRole: "admin",
    module: "admin",
    action: "admin_action",
    entityType: "config",
    entityId: id("cfg"),
    summary,
  });
  return getSnapshot();
}

export async function getAdminAggregates() {
  await ensureBootstrapData();
  const [
    visitStatus,
    billingStatus,
    mrdStatus,
    expenseSummary,
    geoSummary,
  ] = await Promise.all([
    prisma.opdVisit.groupBy({
      by: ["stage"],
      _count: { _all: true },
    }),
    prisma.opdVisit.groupBy({
      by: ["billing"],
      _sum: { amountPaid: true, balanceDue: true, billAmount: true },
      _count: { _all: true },
    }),
    prisma.adminMrdRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.adminExpense.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.adminGeoPin.aggregate({
      _sum: { revenue: true, patientCount: true, opdCount: true, ipdCount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    visitStatus,
    billingStatus,
    mrdStatus,
    expenseSummary,
    geoSummary,
  };
}

export async function saveFormSchemaOverride(schema: FormSchema, actor = "admin") {
  await ensureBootstrapData();
  await prisma.formSchemaOverride.upsert({
    where: { schemaId: schema.id },
    update: { payload: schema },
    create: {
      id: id("schema"),
      schemaId: schema.id,
      payload: schema,
    },
  });
  await writeAuditLog({
    actor,
    actorRole: "admin",
    module: "forms",
    action: "schema_published",
    entityType: "form_schema",
    entityId: schema.id,
    summary: `Schema published: ${schema.id}`,
  });
}

export async function getFormSchemaOverride(schemaId: string) {
  await ensureBootstrapData();
  const row = await prisma.formSchemaOverride.findUnique({ where: { schemaId } });
  return (row?.payload as FormSchema | null) ?? null;
}

export async function resetFormSchemaOverride(schemaId: string, actor = "admin") {
  await ensureBootstrapData();
  await prisma.formSchemaOverride.deleteMany({ where: { schemaId } });
  await writeAuditLog({
    actor,
    actorRole: "admin",
    module: "forms",
    action: "schema_reset",
    entityType: "form_schema",
    entityId: schemaId,
    summary: `Schema reset: ${schemaId}`,
    severity: "warning",
  });
}

export async function listFormSchemaOverrides() {
  await ensureBootstrapData();
  const rows = await prisma.formSchemaOverride.findMany();
  return Object.fromEntries(rows.map((x) => [x.schemaId, x.payload as FormSchema]));
}

export async function saveDocumentTemplate(
  input: { id?: string; kind: string; label: string; layout: string; description?: string; enabled?: boolean },
  actor = "admin",
) {
  await ensureBootstrapData();
  const templateId = input.id ?? id("doc");
  await prisma.documentTemplate.upsert({
    where: { id: templateId },
    update: {
      kind: `admin:${input.kind}`,
      label: input.label,
      layout: input.layout,
      description: input.description ?? "",
      enabled: input.enabled ?? true,
      isSystem: false,
    },
    create: {
      id: templateId,
      kind: `admin:${input.kind}`,
      label: input.label,
      layout: input.layout,
      description: input.description ?? "",
      enabled: input.enabled ?? true,
      isSystem: false,
    },
  });
  await writeAuditLog({
    actor,
    actorRole: "admin",
    module: "admin",
    action: "document_template_saved",
    entityType: "document_template",
    entityId: templateId,
    summary: `Document template saved: ${input.label}`,
  });
  return getSnapshot();
}
