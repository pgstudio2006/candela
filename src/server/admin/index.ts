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
import {
  validateDepartmentInput,
  validateExpenseInput,
  validateMrdRequestInput,
  validateStaffInput,
} from "@/lib/admin-validation";
import {
  computeDataMiningSnapshot,
  computeLiveDiseaseClusters,
  computeLiveGeoClusters,
  type DataMiningSnapshot,
} from "@/lib/admin-analytics";
import { doctorIdFromStaffId } from "@/lib/healthcare-roles";
import { syncDoctorToDepartments, removeDoctorFromAllDepartments } from "@/server/admin/doctor-department-sync";
import {
  assertConfigAccess,
  assertFinanceAccess,
  assertNotViewer,
  requireStaffInBranch,
  type AdminOperator,
} from "@/server/admin/guards";
import { ensureBootstrapData } from "@/server/bootstrap";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { writePlatformAudit } from "@/server/platform-audit";
import { withPrismaError } from "@/server/prisma-errors";
import { backfillBranchScope } from "@/server/branch-scope";
import { branchClinicalWhere } from "@/server/tenancy";

export type AdminAuditEvent = {
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
  auditEvents: AdminAuditEvent[];
  patients: Patient[];
  visits: Visit[];
  dataMining: DataMiningSnapshot;
  documentTemplates: { id: string; label: string; kind: string; layout: string }[];
  activeOperatorId: string;
  activeOperatorName: string;
  activeOperatorRole: string;
  isSuperAdmin: boolean;
  canManageConfig: boolean;
  canManageFinance: boolean;
  isViewer: boolean;
  branchId: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function settingsId(ctx: ServerContext) {
  return `admin_settings_${ctx.tenantId}_${ctx.branchId}`;
}

function branchScopedWhere(ctx: ServerContext) {
  return {
    OR: [{ branchId: ctx.branchId }, { branchId: null }],
  };
}

function toIsoOrString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toAudit(events: Awaited<ReturnType<typeof prisma.adminAuditLog.findMany>>): AdminAuditEvent[] {
  return events.map((x) => ({
    id: x.id,
    at: x.at,
    actor: x.actor,
    actorRole: x.actorRole,
    module: x.module,
    action: x.action,
    entityType: x.entityType,
    entityId: x.entityId,
    summary: x.summary,
    severity: x.severity as AdminAuditEvent["severity"],
  }));
}

function applyKAnonymity(dataMining: DataMiningSnapshot, min: number): DataMiningSnapshot {
  if (min <= 1) return dataMining;
  return {
    ...dataMining,
    livePrevalence: dataMining.livePrevalence.filter((p) => p.count >= min),
    prevalenceBars: dataMining.prevalenceBars.filter((p) => p.perThousand >= min),
  };
}

async function loadSettings(ctx: ServerContext): Promise<{
  settings: AdminPlatformSettings;
  resolvedLeakageIds: string[];
  rowId: string;
}> {
  const scopedId = settingsId(ctx);
  let row = await prisma.adminSetting.findUnique({ where: { id: scopedId } });
  if (!row) {
    const legacy = await prisma.adminSetting.findUnique({ where: { id: "admin_settings" } });
    row = await prisma.adminSetting.upsert({
      where: { id: scopedId },
      create: {
        id: scopedId,
        kAnonymityMin: legacy?.kAnonymityMin ?? 5,
        geoAggregateOnly: legacy?.geoAggregateOnly ?? true,
        auditRetentionYears: legacy?.auditRetentionYears ?? 7,
        outbreakAlerts: legacy?.outbreakAlerts ?? true,
        autoMisDaily: legacy?.autoMisDaily ?? true,
        whatsappConsentFlag: legacy?.whatsappConsentFlag ?? false,
        resolvedLeakageIds: legacy?.resolvedLeakageIds ?? [],
      },
      update: {},
    });
  }
  return {
    rowId: scopedId,
    settings: {
      kAnonymityMin: row.kAnonymityMin,
      geoAggregateOnly: row.geoAggregateOnly,
      auditRetentionYears: row.auditRetentionYears,
      outbreakAlerts: row.outbreakAlerts,
      autoMisDaily: row.autoMisDaily,
      whatsappConsentFlag: row.whatsappConsentFlag,
    },
    resolvedLeakageIds: parseArray<string>(row.resolvedLeakageIds),
  };
}

async function auditedMutation(
  ctx: ServerContext,
  operator: AdminOperator,
  op: () => Promise<void>,
  audit: {
    module: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    severity?: "info" | "warning" | "critical";
    payload?: unknown;
  },
) {
  await op();
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: audit.module,
    action: audit.action,
    entityType: audit.entityType,
    entityId: audit.entityId,
    summary: audit.summary,
    severity: audit.severity,
    payload: audit.payload,
  });
  return getAdminSnapshotForContext(ctx, operator);
}

export async function getAdminSnapshotForContext(
  ctx: ServerContext,
  operator: AdminOperator,
): Promise<AdminSnapshot> {
  return withPrismaError(async () => {
  await ensureBootstrapData();
  await backfillBranchScope(ctx);
  const clinicalWhere = branchClinicalWhere(ctx);
  if (ctx.branchId?.trim()) {
    try {
      await prisma.adminStaff.updateMany({
        where: { branchId: "" },
        data: { branchId: ctx.branchId },
      });
    } catch {
      /* best-effort — do not block admin workspace load */
    }
  }
  const { settings, resolvedLeakageIds } = await loadSettings(ctx);

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
    auditEvents,
    patients,
    visits,
    documentTemplates,
    formSubmissions,
    consultations,
  ] = await Promise.all([
    prisma.adminStaff.findMany({
      where: {
        OR: [{ branchId: ctx.branchId }, { branchId: "" }],
      },
      orderBy: { name: "asc" },
    }),
    prisma.adminDepartment.findMany({ orderBy: { label: "asc" } }),
    prisma.adminDiseaseNode.findMany({ orderBy: { label: "asc" } }),
    prisma.adminDiseaseCluster.findMany({ orderBy: { caseCount: "desc" } }),
    prisma.adminGeoPin.findMany({ orderBy: { patientCount: "desc" } }),
    prisma.adminExpense.findMany({ where: branchScopedWhere(ctx), orderBy: { date: "desc" } }),
    prisma.adminRevenuePolicy.findMany({ orderBy: { label: "asc" } }),
    prisma.adminMrdRequest.findMany({ where: branchScopedWhere(ctx), orderBy: { requestedAt: "desc" } }),
    prisma.adminMisReport.findMany({ orderBy: { label: "asc" } }),
    prisma.adminAuditLog.findMany({ orderBy: { at: "desc" }, take: 300 }),
    prisma.patient.findMany({ where: clinicalWhere, orderBy: { fullName: "asc" }, take: 3000 }),
    prisma.opdVisit.findMany({ where: clinicalWhere, orderBy: { checkInAt: "desc" }, take: 5000 }),
    prisma.documentTemplate.findMany({ where: { kind: { startsWith: "admin:" } } }),
    prisma.formSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 500 }),
    prisma.consultation.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const mappedPatients = patients.map((x) => ({
    id: x.id,
    uhid: x.uhid,
    name: x.name ?? x.fullName ?? "",
    phone: x.phone,
    email: x.email ?? undefined,
    age: x.age ?? 0,
    gender: (x.gender ?? "O") as Patient["gender"],
    department: x.department ?? "",
    departmentId: x.departmentId ?? "",
    tags: Array.isArray(x.tags) ? x.tags : parseArray<string>(x.tags),
    balance: Number(x.balance),
    lastVisit: toIsoOrString(x.lastVisit),
    referrer: x.referrer ?? undefined,
  })) as Patient[];

  const mappedVisits = visits.map((x) => ({
    id: x.id,
    patientId: x.patientId,
    token: x.token ?? undefined,
    stage: x.stage as Visit["stage"],
    departmentId: x.departmentId ?? "",
    doctorId: x.doctorId ?? "",
    doctorName: x.doctorName ?? "",
    billing: (x.billing ?? "") as Visit["billing"],
    exam: (x.exam ?? "") as Visit["exam"],
    appointment: x.appointment,
    appointmentTime: x.appointmentTime ?? undefined,
    waitMin: x.waitMin,
    checkInAt: toIsoOrString(x.checkInAt),
    billAmount: x.billAmount === null ? undefined : Number(x.billAmount),
    amountPaid: x.amountPaid === null ? undefined : Number(x.amountPaid),
    balanceDue: x.balanceDue === null ? undefined : Number(x.balanceDue),
  })) as Visit[];

  const mappedDiseaseMap = diseaseMap.map((x) => ({
    id: x.id,
    icd: x.icd,
    label: x.label,
    departmentId: x.departmentId,
    templateId: x.templateId ?? undefined,
    packageIds: parseArray<string>(x.packageIds),
    consentTemplateIds: parseArray<string>(x.consentTemplateIds),
    billingTemplateId: x.billingTemplateId ?? undefined,
  })) as DiseaseMapNode[];

  const baseGeo: GeoCluster[] = geo.map((x) => ({
    id: x.id,
    pincode: x.pincode,
    city: x.city,
    lat: x.lat,
    lng: x.lng,
    patientCount: Number(x.patientCount),
    opdCount: Number(x.opdCount),
    ipdCount: Number(x.ipdCount),
    revenue: Number(x.revenue),
    topDiagnosis: x.topDiagnosis,
    severity: (x.severity as GeoCluster["severity"]) ?? undefined,
  }));

  const patientIds = new Set(mappedPatients.map((p) => p.id));
  const visitIds = new Set(mappedVisits.map((v) => v.id));

  const submissionRows = formSubmissions
    .filter((row) => !row.patientId || patientIds.has(row.patientId))
    .filter((row) => !row.visitId || visitIds.has(row.visitId))
    .map((row) => ({
      patientId: row.patientId,
      visitId: row.visitId,
      data: (row.data ?? {}) as Record<string, string | number | boolean>,
    }));

  const consultationRows = consultations
    .filter((row) => patientIds.has(row.patientId) || visitIds.has(row.visitId))
    .map((row) => ({
      patientId: row.patientId,
      status: row.status,
      completedAt: toIsoOrString(row.completedAt) ?? null,
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
  const dataMining = applyKAnonymity(
    computeDataMiningSnapshot(
      mappedPatients,
      mappedVisits,
      consultationRows,
      submissionRows.filter((s) => s.data),
      mappedDiseaseMap,
    ),
    settings.kAnonymityMin,
  );

  return {
    staff: staff.map((x) => ({
      id: x.id,
      name: x.name,
      email: x.email,
      phone: x.phone,
      role: x.role as StaffMember["role"],
      departmentIds: parseArray<string>(x.departmentIds),
      branchId: x.branchId,
      licenseNo: x.licenseNo ?? undefined,
      onDuty: x.onDuty,
      joinedAt: x.joinedAt,
    })),
    departments: departments.map((x) => ({
      id: x.id,
      label: x.label,
      headStaffId: x.headStaffId ?? undefined,
      doctorIds: parseArray<string>(x.doctorIds),
      defaultPackageIds: parseArray<string>(x.defaultPackageIds),
      revenuePolicyId: x.revenuePolicyId ?? undefined,
      bays: parseArray<string>(x.bays),
      active: x.active,
    })),
    diseaseMap: mappedDiseaseMap,
    diseaseClusters: (liveDiseaseClusters.length
      ? liveDiseaseClusters
      : diseaseClusters.map((x) => ({
          id: x.id,
          locality: x.locality,
          lat: x.lat,
          lng: x.lng,
          caseCount: x.caseCount,
          severity: x.severity as DiseaseCluster["severity"],
          topDisease: x.topDisease,
          surgePercent: x.surgePercent ?? undefined,
        }))) as DiseaseCluster[],
    geo: liveGeo,
    expenses: expenses.map((x) => ({
      id: x.id,
      date: x.date,
      vendor: x.vendor,
      category: x.category,
      departmentId: x.departmentId,
      amount: Number(x.amount),
      status: x.status as ExpenseEntry["status"],
      notes: x.notes ?? undefined,
    })),
    revenuePolicies: revenuePolicies.map((x) => ({
      id: x.id,
      label: x.label,
      departmentId: x.departmentId,
      doctorId: x.doctorId ?? undefined,
      opdConsultPercent: Number(x.opdConsultPercent),
      packageNetPercent: Number(x.packageNetPercent),
      ipdDayFixed: Number(x.ipdDayFixed),
      appliesToPartial: x.appliesToPartial,
      active: x.active,
    })),
    mrdRequests: mrdRequests.map((x) => ({
      id: x.id,
      patientName: x.patientName,
      uhid: x.uhid,
      requestType: x.requestType as MrdRequest["requestType"],
      requestedAt: x.requestedAt,
      status: x.status as MrdRequest["status"],
      slaDue: x.slaDue,
      documents: parseArray<string>(x.documents),
    })),
    misReports: misReports.map((x) => ({
      id: x.id,
      label: x.label,
      category: x.category as MisReport["category"],
      schedule: x.schedule as MisReport["schedule"],
      format: x.format as MisReport["format"],
      lastRun: toIsoOrString(x.lastRun),
    })),
    settings,
    resolvedLeakageIds,
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
    activeOperatorId: operator.operatorId,
    activeOperatorName: operator.name,
    activeOperatorRole: operator.staffRole,
    isSuperAdmin: operator.isSuperAdmin,
    canManageConfig: operator.canManageConfig,
    canManageFinance: operator.canManageFinance,
    isViewer: operator.isViewer,
    branchId: ctx.branchId,
  };
  });
}

export async function listAdminPlatformAuditLogs(
  ctx: ServerContext,
  input: { limit?: number; cursor?: string } = {},
) {
  const limit = Math.min(100, Math.max(10, input.limit ?? 50));
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      module: "admin",
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actor: r.actor,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    severity: r.severity as "info" | "warning" | "critical",
  }));
}

export async function updateStaff(
  ctx: ServerContext,
  operator: AdminOperator,
  id: string,
  patch: Partial<StaffMember>,
) {
  assertConfigAccess(operator);
  await requireStaffInBranch(ctx, id);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      const existing = await prisma.adminStaff.findUnique({ where: { id } });
      await prisma.adminStaff.update({ where: { id }, data: patch });
      const role = patch.role ?? existing?.role;
      const departmentIds =
        patch.departmentIds ?? parseArray<string>(existing?.departmentIds);
      if (role === "doctor") {
        await syncDoctorToDepartments(id, departmentIds ?? []);
      } else if (existing?.role === "doctor") {
        await removeDoctorFromAllDepartments(doctorIdFromStaffId(id));
      }
      const updated = await prisma.adminStaff.findUnique({ where: { id } });
      if (updated) {
        const { syncStaffUserProfile } = await import("@/server/admin/staff-onboarding");
        await syncStaffUserProfile(ctx, updated);
      }
    },
    {
      module: "admin",
      action: "staff_updated",
      entityType: "staff",
      entityId: id,
      summary: `Staff updated: ${id}`,
      payload: patch,
    },
  );
}

export async function addStaff(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<StaffMember, "id">,
) {
  assertConfigAccess(operator);
  validateStaffInput({ ...input, branchId: ctx.branchId });
  const email = input.email.trim().toLowerCase();
  const dup = await prisma.adminStaff.findFirst({ where: { email } });
  if (dup) throw new ServerActionError("CONFLICT", "A staff member with this email already exists.");
  const newId = createId("st");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminStaff.create({
        data: {
          id: newId,
          ...input,
          email,
          branchId: ctx.branchId,
        },
      });
      if (input.role === "doctor" && input.departmentIds?.length) {
        await syncDoctorToDepartments(newId, input.departmentIds);
      }
    },
    {
      module: "admin",
      action: "staff_added",
      entityType: "staff",
      entityId: newId,
      summary: `Staff added: ${input.name}`,
    },
  );
}

export async function removeStaff(ctx: ServerContext, operator: AdminOperator, idValue: string) {
  assertConfigAccess(operator);
  await requireStaffInBranch(ctx, idValue);
  const staff = await prisma.adminStaff.findUnique({ where: { id: idValue } });
  const staffName = staff?.name ?? idValue;
  return auditedMutation(
    ctx,
    operator,
    async () => {
      const { removeStaffMember } = await import("@/server/admin/staff-onboarding");
      await removeStaffMember(ctx, idValue);
    },
    {
      module: "admin",
      action: "staff_removed",
      entityType: "staff",
      entityId: idValue,
      summary: `Staff removed: ${staffName}`,
      severity: "warning",
    },
  );
}

export async function updateDepartment(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
  patch: Partial<DepartmentConfig>,
) {
  assertConfigAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDepartment.update({ where: { id: idValue }, data: patch });
    },
    {
      module: "admin",
      action: "department_updated",
      entityType: "department",
      entityId: idValue,
      summary: `Department updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addDepartment(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<DepartmentConfig, "id">,
) {
  assertConfigAccess(operator);
  validateDepartmentInput(input);
  const newId = createId("dept");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDepartment.create({ data: { id: newId, ...input } });
    },
    {
      module: "admin",
      action: "department_added",
      entityType: "department",
      entityId: newId,
      summary: `Department added: ${input.label}`,
    },
  );
}

export async function removeDepartment(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
) {
  assertConfigAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDepartment.delete({ where: { id: idValue } });
      const branchStaff = await prisma.adminStaff.findMany({
        where: { branchId: ctx.branchId },
      });
      for (const member of branchStaff) {
        const departmentIds = parseArray<string>(member.departmentIds).filter((x) => x !== idValue);
        await prisma.adminStaff.update({
          where: { id: member.id },
          data: { departmentIds },
        });
      }
    },
    {
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
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
  patch: Partial<DiseaseMapNode>,
) {
  assertConfigAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDiseaseNode.update({ where: { id: idValue }, data: patch });
    },
    {
      module: "admin",
      action: "disease_node_updated",
      entityType: "disease_node",
      entityId: idValue,
      summary: `Disease node updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addDiseaseNode(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<DiseaseMapNode, "id">,
) {
  assertConfigAccess(operator);
  const newId = createId("dm");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDiseaseNode.create({ data: { id: newId, ...input } });
    },
    {
      module: "admin",
      action: "disease_node_added",
      entityType: "disease_node",
      entityId: newId,
      summary: `Disease node added: ${input.label}`,
    },
  );
}

export async function removeDiseaseNode(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
) {
  assertConfigAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminDiseaseNode.delete({ where: { id: idValue } });
    },
    {
      module: "admin",
      action: "disease_node_removed",
      entityType: "disease_node",
      entityId: idValue,
      summary: `Disease node removed: ${idValue}`,
      severity: "warning",
    },
  );
}

export async function addExpense(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<ExpenseEntry, "id">,
) {
  assertFinanceAccess(operator);
  validateExpenseInput(input);
  const newId = createId("ex");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminExpense.create({
        data: { id: newId, ...input, branchId: ctx.branchId, status: input.status ?? "pending" },
      });
    },
    {
      module: "finance",
      action: "expense_added",
      entityType: "expense",
      entityId: newId,
      summary: `Expense submitted: ${input.vendor}`,
    },
  );
}

export async function approveExpense(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
  approved: boolean,
) {
  assertFinanceAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminExpense.update({
        where: { id: idValue },
        data: { status: approved ? "approved" : "rejected" },
      });
    },
    {
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
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
  patch: Partial<RevenueSharePolicy>,
) {
  assertFinanceAccess(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminRevenuePolicy.update({ where: { id: idValue }, data: patch });
    },
    {
      module: "admin",
      action: "revenue_policy_updated",
      entityType: "revenue_policy",
      entityId: idValue,
      summary: `Revenue policy updated: ${idValue}`,
      payload: patch,
    },
  );
}

export async function addRevenuePolicy(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<RevenueSharePolicy, "id">,
) {
  assertFinanceAccess(operator);
  const newId = createId("rsp");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminRevenuePolicy.create({ data: { id: newId, ...input } });
    },
    {
      module: "admin",
      action: "revenue_policy_added",
      entityType: "revenue_policy",
      entityId: newId,
      summary: `Revenue policy added: ${input.label}`,
    },
  );
}

export async function updateMrdStatus(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
  status: MrdRequest["status"],
) {
  assertNotViewer(operator);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminMrdRequest.update({ where: { id: idValue }, data: { status } });
    },
    {
      module: "mrd",
      action: "mrd_status_updated",
      entityType: "mrd_request",
      entityId: idValue,
      summary: `MRD status -> ${status}`,
    },
  );
}

export async function addMrdRequest(
  ctx: ServerContext,
  operator: AdminOperator,
  input: Omit<MrdRequest, "id" | "requestedAt" | "status">,
) {
  assertNotViewer(operator);
  validateMrdRequestInput(input);
  const newId = createId("mrd");
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminMrdRequest.create({
        data: {
          id: newId,
          ...input,
          branchId: ctx.branchId,
          requestedAt: new Date().toISOString(),
          status: "pending",
        },
      });
    },
    {
      module: "mrd",
      action: "mrd_request_added",
      entityType: "mrd_request",
      entityId: newId,
      summary: `MRD request added: ${input.patientName}`,
    },
  );
}

export async function runMisReport(
  ctx: ServerContext,
  operator: AdminOperator,
  idValue: string,
): Promise<{ snapshot: AdminSnapshot; csv: string; filename: string }> {
  assertNotViewer(operator);
  const report = await prisma.adminMisReport.findUnique({ where: { id: idValue } });
  const visitCount = await prisma.opdVisit.count({ where: { branchId: ctx.branchId } });
  const revenue = await prisma.invoice.aggregate({
    where: { branchId: ctx.branchId },
    _sum: { amountPaid: true },
  });
  const rev = Number(revenue._sum.amountPaid ?? 0);
  const csv = [
    "report,generated_at,branch_id,active_visits,revenue_collected",
    `${report?.label ?? idValue},${new Date().toISOString()},${ctx.branchId},${visitCount},${rev}`,
  ].join("\n");
  const filename = `mis-${(report?.label ?? idValue).replace(/\s+/g, "-").toLowerCase()}.csv`;

  await prisma.adminMisReport.update({
    where: { id: idValue },
    data: { lastRun: new Date().toISOString() },
  });

  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "mis",
    action: "mis_run",
    entityType: "mis_report",
    entityId: idValue,
    summary: `MIS run: ${report?.label ?? idValue} (${visitCount} visits, ₹${rev})`,
    payload: { visitCount, revenue: rev, branchId: ctx.branchId },
  });

  return {
    snapshot: await getAdminSnapshotForContext(ctx, operator),
    csv,
    filename,
  };
}

export async function updateAdminSettings(
  ctx: ServerContext,
  operator: AdminOperator,
  patch: Partial<AdminPlatformSettings>,
) {
  assertConfigAccess(operator);
  const { rowId } = await loadSettings(ctx);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminSetting.update({ where: { id: rowId }, data: patch });
    },
    {
      module: "admin",
      action: "admin_settings_updated",
      entityType: "settings",
      entityId: rowId,
      summary: "Admin settings updated",
      payload: patch,
    },
  );
}

export async function resolveLeakageFlag(
  ctx: ServerContext,
  operator: AdminOperator,
  flagId: string,
) {
  assertFinanceAccess(operator);
  const { rowId, resolvedLeakageIds } = await loadSettings(ctx);
  const resolved = new Set(resolvedLeakageIds);
  resolved.add(flagId);
  return auditedMutation(
    ctx,
    operator,
    async () => {
      await prisma.adminSetting.update({
        where: { id: rowId },
        data: { resolvedLeakageIds: [...resolved] },
      });
    },
    {
      module: "rcm",
      action: "leakage_resolved",
      entityType: "leakage_flag",
      entityId: flagId,
      summary: `Leakage flag resolved: ${flagId}`,
    },
  );
}

export async function logAdminAction(
  ctx: ServerContext,
  operator: AdminOperator,
  summary: string,
) {
  assertNotViewer(operator);
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "admin",
    action: "admin_action",
    entityType: "config",
    entityId: createId("cfg"),
    summary,
  });
  return getAdminSnapshotForContext(ctx, operator);
}

export async function saveFormSchemaOverride(
  ctx: ServerContext,
  operator: AdminOperator,
  schema: FormSchema,
) {
  assertConfigAccess(operator);
  await prisma.formSchemaOverride.upsert({
    where: { schemaId: schema.id },
    update: { payload: schema },
    create: { id: createId("schema"), schemaId: schema.id, payload: schema },
  });
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "forms",
    action: "schema_published",
    entityType: "form_schema",
    entityId: schema.id,
    summary: `Schema published: ${schema.id}`,
  });
}

export async function getFormSchemaOverride(ctx: ServerContext, schemaId: string) {
  await resolveAdminRead(ctx);
  const row = await prisma.formSchemaOverride.findUnique({ where: { schemaId } });
  return (row?.payload as FormSchema | null) ?? null;
}

export async function resetFormSchemaOverride(
  ctx: ServerContext,
  operator: AdminOperator,
  schemaId: string,
) {
  assertConfigAccess(operator);
  await prisma.formSchemaOverride.deleteMany({ where: { schemaId } });
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "forms",
    action: "schema_reset",
    entityType: "form_schema",
    entityId: schemaId,
    summary: `Schema reset: ${schemaId}`,
    severity: "warning",
  });
}

export async function listFormSchemaOverrides(ctx: ServerContext) {
  await resolveAdminRead(ctx);
  const rows = await prisma.formSchemaOverride.findMany();
  return Object.fromEntries(rows.map((x) => [x.schemaId, x.payload as FormSchema]));
}

export async function saveDocumentTemplate(
  ctx: ServerContext,
  operator: AdminOperator,
  input: {
    id?: string;
    kind: string;
    label: string;
    layout: string;
    description?: string;
    enabled?: boolean;
  },
) {
  assertConfigAccess(operator);
  const templateId = input.id ?? createId("doc");
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
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "admin",
    action: "document_template_saved",
    entityType: "document_template",
    entityId: templateId,
    summary: `Document template saved: ${input.label}`,
  });
  return getAdminSnapshotForContext(ctx, operator);
}

export async function exportRevenueShareCsv(
  ctx: ServerContext,
  operator: AdminOperator,
  policyId: string,
  doctorName: string,
  gross: number,
  share: number,
  packagesClosed: number,
) {
  assertFinanceAccess(operator);
  const csv = [
    "doctor,policy_id,branch_id,gross_collected,doctor_share,packages_closed,generated_at",
    `${doctorName},${policyId},${ctx.branchId},${gross},${share},${packagesClosed},${new Date().toISOString()}`,
  ].join("\n");
  await writePlatformAudit({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "finance",
    action: "revenue_share_export",
    entityType: "revenue_policy",
    entityId: policyId,
    summary: `Revenue share export: ${doctorName} · ₹${share}`,
  });
  return { csv, filename: `revenue-share-${policyId}.csv` };
}

async function resolveAdminRead(_ctx: ServerContext) {
  await import("@/server/module-operator").then(({ resolveAdminOperator }) => resolveAdminOperator());
}
