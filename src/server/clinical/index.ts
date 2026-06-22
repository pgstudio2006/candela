import { Prisma } from "@prisma/client";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import { DOCTOR_TEMPLATES, IPD_PATIENTS } from "@/design-system/doctor-data";
import { DEFAULT_DOCUMENT_TEMPLATES } from "@/design-system/document-templates";
import { PATIENTS as SEED_PATIENTS, VISITS as SEED_VISITS, type Patient, type Visit } from "@/design-system/frontdesk-data";
import type { Appointment, FormSubmission, FrontdeskCounters } from "@/lib/frontdesk-workflow";
import { ageFromDob, computeWaitMinutes, deptLabel, doctorName, mapPrismaPatientRow, matchPatientByQuery, nextUhid, patientDisplayName, templateAmount } from "@/lib/frontdesk-workflow";
import { billingFromPayment, resolveOpdFirstRoute, resolvePostCounselRoute, treatmentPathFromConvert, type PaymentScope } from "@/lib/billing-routing";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { upsertVisitInvoice, getVisitReceipt } from "@/server/invoicing";
import { buildPatientRegistrationPayload } from "@/lib/registration-meta";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import {
  billingSchema,
  checkInSchema,
  normalizeRegisterPatientInput,
  registerPatientSchema,
  validateFrontdeskInput,
} from "@/lib/frontdesk-validation";
import { ensureHospitalBootstrap } from "@/server/hospital-bootstrap";
import { writePlatformAudit } from "@/server/platform-audit";
import { branchScope } from "@/server/tenancy";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";
import { loadClinicalRoster } from "@/server/clinical/roster";
import { withPrismaError } from "@/server/prisma-errors";
import { DOCTOR_HR_EMAIL_MAP, resolveDoctorName, staffIdFromDoctorId } from "@/lib/clinical-roster";
import type { ClinicalRoster } from "@/lib/clinical-roster";
import { notifyAppointmentReminder } from "@/server/notifications";

type PrimitiveRecord = Record<string, string | number | boolean>;

type RegisterInput = Record<string, string | number | boolean>;
type CheckInInput = Record<string, string | number | boolean>;
type BillingInput = Record<string, string | number | boolean>;
type AppointmentInput = Record<string, string | number | boolean>;

export type CounselBillingInput = {
  paymentScope: PaymentScope;
  collectedAmount: number;
  mode: string;
  convertToIpd: boolean;
  ward?: string;
  bed?: string;
  deferReason?: string;
  handoff: BillingHandoffPayload;
};

export type BillingResult = {
  routeHref: string;
  routingLabel: string;
  routingNote: string;
  visitId: string;
  invoiceNumber: string;
  paymentMode: string;
  token?: number;
};

export type ClinicalSnapshot = {
  patients: Patient[];
  visits: Visit[];
  appointments: Appointment[];
  submissions: FormSubmission[];
  counters: FrontdeskCounters;
  billingHandoffs: BillingHandoffPayload[];
  roster: ClinicalRoster;
};

function asStringArray(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function asRecord(value: Prisma.JsonValue | null): PrimitiveRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PrimitiveRecord;
}

function asUnknownRecord(value: Prisma.JsonValue | null): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string | number | boolean>;
}

function parseCounterFromId(prefix: string, id: string): number {
  if (!id.startsWith(prefix)) return 0;
  const parsed = Number(id.replace(prefix, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseUhidCounter(uhid: string): number {
  const suffix = uhid.split("-").pop() ?? "";
  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapVisit(row: {
  id: string;
  patientId: string;
  token: number | null;
  stage: string;
  departmentId: string | null;
  doctorId: string | null;
  doctorName: string | null;
  billing: string | null;
  exam: string | null;
  appointment: boolean;
  appointmentTime: string | null;
  waitMin: number;
  checkInAt: string | null;
  billAmount: number | null;
  amountPaid: number | null;
  balanceDue: number | null;
  treatmentPath: string | null;
  ipdAdmissionId: string | null;
  counselPackageLabel: string | null;
  deferredReason: string | null;
  routingNote: string | null;
  notes: string | null;
}): Visit {
  return {
    id: row.id,
    patientId: row.patientId,
    token: row.token ?? undefined,
    stage: (row.stage ?? "registered") as Visit["stage"],
    departmentId: row.departmentId ?? "dept_spine",
    doctorId: row.doctorId || "dr_1",
    doctorName: row.doctorName ?? "",
    billing: (row.billing ?? "pending") as Visit["billing"],
    exam: (row.exam ?? "not_started") as Visit["exam"],
    appointment: row.appointment,
    appointmentTime: row.appointmentTime ?? undefined,
    waitMin: computeWaitMinutes(row.checkInAt),
    checkInAt: row.checkInAt ?? undefined,
    billAmount: row.billAmount ?? undefined,
    amountPaid: row.amountPaid ?? undefined,
    balanceDue: row.balanceDue ?? undefined,
    treatmentPath: (row.treatmentPath as Visit["treatmentPath"]) ?? undefined,
    ipdAdmissionId: row.ipdAdmissionId ?? undefined,
    counselPackageLabel: row.counselPackageLabel ?? undefined,
    deferredReason: row.deferredReason ?? undefined,
    routingNote: row.routingNote ?? undefined,
    notes: row.notes ?? undefined,
  };
}

async function ensureClinicalSeed() {
  if (!isDemoSeedEnabled()) return;
  const patientCount = await prisma.patient.count();
  if (patientCount > 0) return;

  await prisma.$transaction(async (tx) => {
    for (const patient of SEED_PATIENTS) {
      await tx.patient.create({
        data: {
          id: patient.id,
          uhid: patient.uhid,
          name: patient.name,
          phone: patient.phone,
          email: patient.email,
          age: patient.age,
          gender: patient.gender,
          department: patient.department,
          departmentId: patient.departmentId,
          tags: patient.tags,
          balance: patient.balance,
          lastVisit: patient.lastVisit,
          referrer: patient.referrer,
        },
      });
    }

    for (const visit of SEED_VISITS) {
      await tx.opdVisit.create({
        data: {
          id: visit.id,
          patientId: visit.patientId,
          token: visit.token,
          stage: visit.stage,
          departmentId: visit.departmentId,
          doctorId: visit.doctorId,
          doctorName: visit.doctorName,
          billing: visit.billing,
          exam: visit.exam,
          appointment: visit.appointment,
          appointmentTime: visit.appointmentTime,
          waitMin: visit.waitMin,
          checkInAt: visit.checkInAt,
          billAmount: visit.billAmount,
          amountPaid: visit.amountPaid,
          balanceDue: visit.balanceDue,
          treatmentPath: visit.treatmentPath,
          ipdAdmissionId: visit.ipdAdmissionId,
          counselPackageLabel: visit.counselPackageLabel,
          deferredReason: visit.deferredReason,
          routingNote: visit.routingNote,
        },
      });
    }

    for (const template of DOCTOR_TEMPLATES) {
      await tx.doctorTemplate.create({
        data: {
          id: template.id,
          label: template.label,
          doctorId: template.doctorId,
          disease: template.disease,
          diagnosis: template.diagnosis,
          treatment: template.treatment,
          prescription: template.prescription,
          isSystem: true,
        },
      });
    }

    for (const ipd of IPD_PATIENTS) {
      const seedVisitId = `vipd_${ipd.id}`;
      const existingVisit = await tx.opdVisit.findUnique({ where: { id: seedVisitId } });
      if (!existingVisit) {
        await tx.opdVisit.create({
          data: {
            id: seedVisitId,
            patientId: ipd.patientId,
            stage: "ipd_admitted",
            departmentId: "dept_spine",
            doctorId: ipd.attendingDoctorId,
            doctorName: "Doctor",
            billing: "paid",
            exam: "done",
            appointment: false,
            waitMin: 0,
            treatmentPath: "ipd",
            ipdAdmissionId: ipd.id,
            routingNote: "Seed IPD admission",
          },
        });
      }
      await tx.ipdAdmission.create({
        data: {
          id: ipd.id,
          visitId: seedVisitId,
          patientId: ipd.patientId,
          ward: ipd.ward,
          bed: ipd.bed,
          admittedAt: ipd.admittedAt,
          diagnosis: ipd.diagnosis,
          attendingDoctorId: ipd.attendingDoctorId,
          lastRoundAt: ipd.lastRoundAt,
          lastRoundNote: ipd.lastRoundNote,
          status: ipd.status,
        },
      });
    }

    for (const template of DEFAULT_DOCUMENT_TEMPLATES) {
      await tx.documentTemplate.create({ data: template });
    }
  });
}

async function backfillBranchScope(ctx: ServerContext) {
  const scope = branchScope(ctx);
  await prisma.patient.updateMany({
    where: { tenantId: null, branchId: null },
    data: scope,
  });
  await prisma.opdVisit.updateMany({
    where: { tenantId: null, branchId: null },
    data: scope,
  });

  const branchVisitIds = (
    await prisma.opdVisit.findMany({ where: scope, select: { id: true } })
  ).map((v) => v.id);
  if (branchVisitIds.length > 0) {
    await prisma.appointment.updateMany({
      where: {
        visitId: { in: branchVisitIds },
        OR: [{ branchId: null }, { tenantId: null }],
      },
      data: scope,
    });
  }

  const nullNamePatients = await prisma.patient.findMany({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      OR: [{ name: null }, { name: "" }],
    },
    select: { id: true, fullName: true, uhid: true },
  });
  for (const row of nullNamePatients) {
    const name = patientDisplayName(row);
    await prisma.patient.update({ where: { id: row.id }, data: { name } });
  }
}

async function requireVisitInBranch(ctx: ServerContext, visitId: string) {
  const visit = await prisma.opdVisit.findFirst({
    where: { id: visitId, ...branchScope(ctx) },
  });
  if (!visit) {
    throw new ServerActionError("NOT_FOUND", "Visit not found in your branch.");
  }
  return visit;
}

async function assertNoDuplicatePatient(
  ctx: ServerContext,
  _phone: string,
  uhid: string,
  excludeId?: string,
  force = false,
) {
  if (force) return;
  const scope = branchScope(ctx);
  const phoneNorm = _phone.replace(/\D/g, "").slice(-10);
  if (phoneNorm.length >= 10) {
    const phoneDup = await prisma.patient.findFirst({
      where: {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        phone: { endsWith: phoneNorm },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (phoneDup) {
      throw new ServerActionError(
        "DUPLICATE_PHONE",
        `Phone already registered: ${patientDisplayName(phoneDup)} (${phoneDup.uhid}). Use check-in instead.`,
        { existingId: phoneDup.id, existingUhid: phoneDup.uhid },
      );
    }
  }
  const existing = await prisma.patient.findFirst({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      uhid,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new ServerActionError(
      "DUPLICATE_PATIENT",
      `UHID already registered: ${existing.name ?? "Unknown"} (${existing.uhid}).`,
      { existingId: existing.id, existingUhid: existing.uhid, existingName: existing.name },
    );
  }
}

const DUPLICATE_OVERRIDE_ROLES = new Set(["admin", "super_admin", "branch_admin", "branch_manager"]);

export async function checkDuplicatePatient(
  ctx: ServerContext,
  phone: string,
  uhid?: string,
  excludeId?: string,
) {
  const scope = branchScope(ctx);
  const phoneDigits = phone.replace(/\D/g, "").slice(-10);
  const existing = await prisma.patient.findFirst({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: [
        ...(uhid ? [{ uhid }] : []),
        ...(phoneDigits.length >= 10 ? [{ phone: { endsWith: phoneDigits } }] : []),
      ],
    },
  });
  if (!existing) return { duplicate: false as const };
  return {
    duplicate: true as const,
    patient: {
      id: existing.id,
      uhid: existing.uhid,
      name: existing.name ?? existing.fullName ?? "Unknown",
      phone: existing.phone,
    },
  };
}

export function canOverrideDuplicate(role: string) {
  return DUPLICATE_OVERRIDE_ROLES.has(role);
}

function buildCounters(patients: Patient[], visits: Visit[], appointments: Appointment[]): FrontdeskCounters {
  const patientCounter = Math.max(0, ...patients.map((p) => parseUhidCounter(p.uhid)));
  const visitCounter = Math.max(0, ...visits.map((v) => parseCounterFromId("v", v.id)));
  const tokenCounter = Math.max(0, ...visits.map((v) => v.token ?? 0));
  const appointmentCounter = Math.max(0, ...appointments.map((a) => parseCounterFromId("ap", a.id)));
  return {
    patient: patientCounter,
    visit: visitCounter,
    token: tokenCounter,
    appointment: appointmentCounter,
  };
}

export async function getClinicalSnapshot(ctx: ServerContext): Promise<ClinicalSnapshot> {
  return withPrismaError(async () => {
  await ensureHospitalBootstrap();
  await ensureClinicalSeed();
  await backfillBranchScope(ctx);
  const scope = branchScope(ctx);

  const [patientsRows, visitsRows, appointmentRows, handoffRows, roster] = await Promise.all([
    prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } }),
    prisma.opdVisit.findMany({ where: scope, orderBy: { createdAt: "asc" } }),
    prisma.appointment.findMany({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.billingHandoff.findMany({ where: { branchId: scope.branchId }, orderBy: { createdAt: "asc" } }),
    loadClinicalRoster(ctx),
  ]);

  const patients: Patient[] = patientsRows.map(mapPrismaPatientRow);

  const visits: Visit[] = visitsRows.map(mapVisit);
  const branchPatientIds = patientsRows.map((p) => p.id);
  const branchVisitIds = visitsRows.map((v) => v.id);

  const submissionRows =
    branchPatientIds.length || branchVisitIds.length
      ? await prisma.formSubmission.findMany({
          where: {
            OR: [
              ...(branchVisitIds.length ? [{ visitId: { in: branchVisitIds } }] : []),
              ...(branchPatientIds.length ? [{ patientId: { in: branchPatientIds } }] : []),
            ],
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const appointments: Appointment[] = appointmentRows
    .filter((row) => row.patientId && row.date && row.time && row.doctorId && row.departmentId)
    .map((row) => ({
      id: row.id,
      patientId: row.patientId!,
      visitId: row.visitId ?? undefined,
      departmentId: row.departmentId!,
      doctorId: row.doctorId!,
      doctorName: row.doctorName ?? "",
      date: row.date!,
      time: row.time!,
      durationMin: row.durationMin ?? 20,
      notes: row.notes ?? undefined,
      status: row.status as Appointment["status"],
    }));

  const submissions: FormSubmission[] = submissionRows.map((row) => ({
    id: row.id,
    formId: row.formId,
    patientId: row.patientId ?? undefined,
    visitId: row.visitId ?? undefined,
    data: asUnknownRecord(row.data),
    submittedAt: String(row.submittedAt ?? new Date().toISOString()),
  }));

  const billingHandoffs: BillingHandoffPayload[] = handoffRows.map((row) => ({
    visitId: row.visitId,
    patientId: row.patientId,
    patientName: row.patientName ?? "Patient",
    uhid: row.uhid ?? "",
    quote: row.quote as BillingHandoffPayload["quote"],
    counsellorName: row.counsellorName,
    counselNotes: row.counselNotes ?? "",
    doctorName: row.doctorName ?? "",
    doctorId: row.doctorId ?? "",
    sentAt: row.sentAt instanceof Date ? row.sentAt.toISOString() : String(row.sentAt),
    paymentExpectation: (row.paymentExpectation ?? "desk") as BillingHandoffPayload["paymentExpectation"],
    treatmentMode: (row.treatmentMode ?? undefined) as BillingHandoffPayload["treatmentMode"],
    admissionRecommended: row.admissionRecommended ?? undefined,
    diagnosisSummary: row.diagnosisSummary ?? undefined,
  }));

  return {
    patients,
    visits,
    appointments,
    submissions,
    counters: buildCounters(patients, visits, appointments),
    billingHandoffs,
    roster,
  };
  });
}

export async function saveSubmission(formId: string, data: PrimitiveRecord, ctx?: { patientId?: string; visitId?: string }) {
  await ensureClinicalSeed();
  if (ctx?.visitId) {
    await prisma.formSubmission.deleteMany({
      where: { formId, visitId: ctx.visitId },
    });
  }

  await prisma.formSubmission.create({
    data: {
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      formId,
      patientId: ctx?.patientId,
      visitId: ctx?.visitId,
      data,
      submittedAt: new Date().toISOString(),
    },
  });
}

export async function registerPatient(
  ctx: ServerContext,
  input: {
    data: RegisterInput;
    patientId: string;
    visitId?: string;
    startVisit?: boolean;
    forceDuplicate?: boolean;
  },
) {
  await ensureHospitalBootstrap();
  await ensureClinicalSeed();
  const { data: rawData, patientId, visitId, startVisit = true, forceDuplicate = false } = input;
  const data = normalizeRegisterPatientInput(rawData);
  validateFrontdeskInput(registerPatientSchema, data);
  const scope = branchScope(ctx);
  if (forceDuplicate && !canOverrideDuplicate(ctx.role)) {
    throw new ServerActionError(
      "FORBIDDEN",
      "Supervisor approval required to register a duplicate patient.",
    );
  }
  const current = await getClinicalSnapshot(ctx);
  const uhid = data.uhid ? String(data.uhid) : nextUhid(current.counters.patient + 1);
  const deptId = String(data.department ?? "dept_spine");
  const first = String(data.firstName ?? "").trim();
  const last = String(data.lastName ?? "").trim();
  const name = `${first} ${last}`.trim() || "New Patient";
  const phone = String(data.phone ?? "");

  await assertNoDuplicatePatient(ctx, phone, uhid, patientId, forceDuplicate);

  const registration = buildPatientRegistrationPayload(data);

  await prisma.patient.upsert({
    where: { id: patientId },
    update: {
      uhid,
      name,
      fullName: name,
      phone,
      email: String(data.email ?? "") || null,
      age: data.dob
        ? ageFromDob(String(data.dob))
        : Number(data.age ?? 0) > 0
          ? Number(data.age)
          : 0,
      gender: String(data.gender ?? "O"),
      department: deptLabel(deptId),
      departmentId: deptId,
      tags: registration.tags,
      referrer: registration.referrer,
      meta: registration.meta,
      tenantId: scope.tenantId,
      branchId: scope.branchId,
    },
    create: {
      id: patientId,
      ...scope,
      uhid,
      name,
      fullName: name,
      phone,
      email: String(data.email ?? "") || null,
      age: data.dob
        ? ageFromDob(String(data.dob))
        : Number(data.age ?? 0) > 0
          ? Number(data.age)
          : 0,
      gender: String(data.gender ?? "O"),
      department: deptLabel(deptId),
      departmentId: deptId,
      tags: registration.tags,
      referrer: registration.referrer,
      meta: registration.meta,
    },
  });

  if (startVisit && visitId) {
    await prisma.opdVisit.upsert({
      where: { id: visitId },
      update: {
        stage: "registered",
        departmentId: deptId,
        tenantId: scope.tenantId,
        branchId: scope.branchId,
      },
      create: {
        id: visitId,
        ...scope,
        patientId,
        stage: "registered",
        departmentId: deptId,
        doctorId: "",
        doctorName: "",
        billing: "pending",
        exam: "not_started",
        appointment: false,
        waitMin: 0,
      },
    });
    const opd = await prisma.opdVisit.findUnique({ where: { id: visitId } });
    if (opd) await syncVisitFromOpdVisit(ctx, opd);
  }

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: forceDuplicate ? "patient_registered_override" : "patient_registered",
    entityType: "patient",
    entityId: patientId,
    summary: forceDuplicate
      ? `Duplicate override: registered ${name} (${uhid})`
      : `Registered ${name} (${uhid})`,
    payload: forceDuplicate ? { forceDuplicate: true, phone, uhid } : undefined,
  });

  return { patientId, visitId: visitId ?? "", uhid };
}

export async function checkInVisit(
  ctx: ServerContext,
  input: { data: CheckInInput; existingVisitId?: string; newVisitId?: string },
) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const { data, existingVisitId, newVisitId } = input;
  validateFrontdeskInput(checkInSchema, data);
  const patients = (
    await prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } })
  ).map(mapPrismaPatientRow);

  const query = String(data.uhid ?? "");
  const patient = matchPatientByQuery(patients, query);
  if (!patient) return { visitId: existingVisitId ?? "", patientId: "" };

  const roster = await loadClinicalRoster(ctx);
  const deptId = String(data.department ?? patient.departmentId);
  const deptDoctors = roster.doctorsByDept[deptId] ?? roster.allDoctors;
  const doctorId = String(data.doctor ?? deptDoctors[0]?.id ?? "");
  if (!doctorId) {
    throw new ServerActionError("VALIDATION", "Select a doctor for this visit.");
  }
  const resolvedDoctorName = resolveDoctorName(doctorId, roster);
  const today = new Date().toISOString().slice(0, 10);
  if (await isDoctorOnLeave(doctorId, today)) {
    throw new ServerActionError(
      "DOCTOR_ON_LEAVE",
      `${resolvedDoctorName} is on approved leave today. Choose another doctor.`,
    );
  }
  const allVisits = await prisma.opdVisit.findMany({ where: scope, orderBy: { createdAt: "asc" } });
  const existing = existingVisitId
    ? allVisits.find((v) => v.id === existingVisitId)
    : allVisits.find(
        (v) =>
          v.patientId === patient.id &&
          ["registered", "checked_in", "billing"].includes(v.stage),
      );

  if (existing) {
    await prisma.opdVisit.update({
      where: { id: existing.id },
      data: {
        stage: "billing",
        departmentId: deptId,
        doctorId,
        doctorName: resolvedDoctorName,
        checkInAt: new Date().toISOString(),
        billing: existing.billing === "paid" ? "paid" : "pending",
        tenantId: scope.tenantId,
        branchId: scope.branchId,
      },
    });
    const updated = await prisma.opdVisit.findUnique({ where: { id: existing.id } });
    if (updated) await syncVisitFromOpdVisit(ctx, updated);
    return { visitId: existing.id, patientId: patient.id };
  }

  if (!newVisitId) return { visitId: "", patientId: patient.id };

  await prisma.opdVisit.create({
    data: {
      id: newVisitId,
      ...scope,
      patientId: patient.id,
      stage: "billing",
      departmentId: deptId,
      doctorId,
      doctorName: resolvedDoctorName,
      billing: "pending",
      exam: "not_started",
      appointment: false,
      waitMin: 0,
      checkInAt: new Date().toISOString(),
    },
  });
  const created = await prisma.opdVisit.findUnique({ where: { id: newVisitId } });
  if (created) await syncVisitFromOpdVisit(ctx, created);
  return { visitId: newVisitId, patientId: patient.id };
}

export async function processBilling(
  ctx: ServerContext,
  visitId: string,
  data: BillingInput,
): Promise<BillingResult> {
  await ensureClinicalSeed();
  const visit = await requireVisitInBranch(ctx, visitId);

  validateFrontdeskInput(billingSchema, data);
  const mode = String(data.mode ?? "upi");
  const paymentScope = (String(data.paymentScope ?? "full") as PaymentScope) || "full";
  const amount = Number(data.amount ?? templateAmount(String(data.template ?? "bt1")));
  const discount = Number(data.discount ?? 0);
  const net = Math.max(0, amount - discount);
  const collected =
    paymentScope === "partial"
      ? Math.min(net, Math.max(0, Number(data.collectedAmount ?? 0)))
      : paymentScope === "defer"
        ? 0
        : net;
  const balanceDue = Math.max(0, net - collected);

  const route = resolveOpdFirstRoute({ paymentScope, mode, visitId, netAmount: net, collected });
  const maxToken = await prisma.opdVisit.aggregate({
    where: branchScope(ctx),
    _max: { token: true },
  });
  const nextToken = (maxToken._max.token ?? 0) + 1;
  const assignedToken = visit.token ?? nextToken;

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: visit.patientId },
      data: { balance: { increment: balanceDue } },
    });
    await tx.opdVisit.update({
      where: { id: visitId },
      data: {
        stage: route.stage,
        billing: billingFromPayment(paymentScope, mode),
        token: assignedToken,
        billAmount: net,
        amountPaid: collected,
        balanceDue: balanceDue > 0 ? balanceDue : null,
        treatmentPath: "opd",
        routingNote: route.routingNote,
        deferredReason: route.billing === "deferred" ? String(data.deferReason ?? "") : null,
        waitMin: computeWaitMinutes(visit.checkInAt),
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
      },
    });
    await upsertVisitInvoice(
      ctx,
      {
        visitId,
        patientId: visit.patientId,
        label: String(data.customLine ?? data.template ?? "OPD consultation"),
        subtotal: amount,
        discount,
        collected,
        mode,
        paymentScope,
      },
      tx,
    );
  });

  const updated = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (updated) await syncVisitFromOpdVisit(ctx, updated);

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "billing_processed",
    entityType: "visit",
    entityId: visitId,
    summary: `Billing ₹${net} (${mode}) — ${route.routingLabel}`,
  });

  const invoice = await prisma.invoice.findUnique({ where: { visitId } });

  return {
    routeHref: route.routeHref,
    routingLabel: route.routingLabel,
    routingNote: route.routingNote,
    visitId,
    invoiceNumber: invoice?.invoiceNumber ?? `NV-${visitId.slice(-8).toUpperCase()}`,
    paymentMode: mode,
    token: assignedToken,
  };
}

export async function fetchVisitReceipt(ctx: ServerContext, visitId: string) {
  return getVisitReceipt(ctx, visitId);
}

export async function processCounselBilling(
  ctx: ServerContext,
  visitId: string,
  input: CounselBillingInput,
): Promise<BillingResult> {
  await ensureClinicalSeed();
  const visit = await requireVisitInBranch(ctx, visitId);

  const { handoff, paymentScope, convertToIpd } = input;
  const net = handoff.quote.netAmount;
  const collected =
    paymentScope === "partial"
      ? Math.min(net, Math.max(0, input.collectedAmount))
      : paymentScope === "defer"
        ? 0
        : net;
  const balanceDue = Math.max(0, net - collected);
  const route = resolvePostCounselRoute({
    paymentScope,
    convertToIpd,
    netAmount: net,
    collected,
    patientId: handoff.patientId,
    visitId,
    audience: "frontdesk",
  });
  const treatmentPath = treatmentPathFromConvert(convertToIpd, handoff.treatmentMode === "daycare" ? "daycare" : "opd");

  let ipdAdmissionId: string | null = null;
  if (convertToIpd) {
    ipdAdmissionId = `ipd_${visitId}`;
    await prisma.ipdAdmission.upsert({
      where: { visitId },
      update: {
        ward: input.ward ?? "MSK Ward A",
        bed: input.bed ?? "A-14",
        diagnosis: handoff.diagnosisSummary ?? handoff.quote.packageLabel,
        status: "admitted",
      },
      create: {
        id: ipdAdmissionId,
        visitId,
        patientId: handoff.patientId,
        ward: input.ward ?? "MSK Ward A",
        bed: input.bed ?? "A-14",
        admittedAt: new Date().toISOString().slice(0, 10),
        diagnosis: handoff.diagnosisSummary ?? handoff.quote.packageLabel,
        attendingDoctorId: handoff.doctorId,
        status: "admitted",
      },
    });
  }

  const consultation = await prisma.consultation.findUnique({ where: { visitId } });

  await prisma.$transaction([
    prisma.patient.update({
      where: { id: handoff.patientId },
      data: { balance: { increment: balanceDue } },
    }),
    prisma.opdVisit.update({
      where: { id: visitId },
      data: {
        stage: route.stage,
        billing: route.billing,
        billAmount: net,
        amountPaid: collected,
        balanceDue: balanceDue > 0 ? balanceDue : null,
        treatmentPath,
        ipdAdmissionId,
        counselPackageLabel: handoff.quote.packageLabel,
        routingNote: route.routingNote,
        deferredReason: route.billing === "deferred" ? input.deferReason ?? "Post-counsel defer" : null,
      },
    }),
    prisma.billingHandoff.deleteMany({ where: { visitId } }),
    prisma.nursingHandoff.upsert({
      where: { visitId },
      update: {
        patientId: handoff.patientId,
        patientName: handoff.patientName,
        uhid: handoff.uhid,
        doctorId: handoff.doctorId,
        doctorName: handoff.doctorName,
        treatmentPath,
        packageId: handoff.quote.packageId,
        packageLabel: handoff.quote.packageLabel,
        billingStatus: route.billing,
        amountPaid: collected,
        balanceDue: balanceDue > 0 ? balanceDue : null,
        netAmount: net,
        commercialConsent: handoff.quote.consentCaptured,
        billingHandoff: handoff,
        consultation: consultation
          ? {
              ...consultation,
              examination: asRecord(consultation.examination),
              diagnosis: asRecord(consultation.diagnosis),
              treatment: asRecord(consultation.treatment),
              prescription: consultation.prescription,
              handoff: consultation.handoff ?? undefined,
            }
          : Prisma.JsonNull,
        ipdWard: convertToIpd ? input.ward : null,
        ipdBed: convertToIpd ? input.bed : null,
        sentAt: new Date().toISOString(),
      },
      create: {
        id: `nh_${visitId}`,
        visitId,
        patientId: handoff.patientId,
        patientName: handoff.patientName,
        uhid: handoff.uhid,
        doctorId: handoff.doctorId,
        doctorName: handoff.doctorName,
        treatmentPath,
        packageId: handoff.quote.packageId,
        packageLabel: handoff.quote.packageLabel,
        billingStatus: route.billing,
        amountPaid: collected,
        balanceDue: balanceDue > 0 ? balanceDue : null,
        netAmount: net,
        commercialConsent: handoff.quote.consentCaptured,
        billingHandoff: handoff,
        consultation: consultation
          ? {
              ...consultation,
              examination: asRecord(consultation.examination),
              diagnosis: asRecord(consultation.diagnosis),
              treatment: asRecord(consultation.treatment),
              prescription: consultation.prescription,
              handoff: consultation.handoff ?? undefined,
            }
          : Prisma.JsonNull,
        ipdWard: convertToIpd ? input.ward : null,
        ipdBed: convertToIpd ? input.bed : null,
        sentAt: new Date().toISOString(),
      },
    }),
  ]);

  const updated = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (updated) await syncVisitFromOpdVisit(ctx, updated);

  await upsertVisitInvoice(ctx, {
    visitId,
    patientId: handoff.patientId,
    label: handoff.quote.packageLabel ?? "Counsellor package",
    subtotal: net,
    discount: 0,
    collected,
    mode: input.mode,
    paymentScope,
  });

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "counsel_billing_processed",
    entityType: "visit",
    entityId: visitId,
    summary: `Post-counsel billing ₹${net}`,
  });

  const counselInvoice = await prisma.invoice.findUnique({ where: { visitId } });
  const counselVisit = await prisma.opdVisit.findUnique({ where: { id: visitId } });

  return {
    routeHref: route.routeHref,
    routingLabel: route.routingLabel,
    routingNote: route.routingNote,
    visitId,
    invoiceNumber: counselInvoice?.invoiceNumber ?? `NV-${visitId.slice(-8).toUpperCase()}`,
    paymentMode: input.mode,
    token: counselVisit?.token ?? undefined,
  };
}

export async function completeJuniorExam(
  ctx: ServerContext,
  visitId: string,
  data?: Record<string, string | number | boolean>,
) {
  await ensureClinicalSeed();
  const visit = await requireVisitInBranch(ctx, visitId);
  if (data && Object.keys(data).length > 0) {
    await saveSubmission("junior-exam", data, { visitId, patientId: visit.patientId });
  }

  const hasRedFlags = Boolean(data?.redFlags);
  const redFlagNotes = String(data?.redFlagNotes ?? "").trim();
  const routingNote = hasRedFlags
    ? `RED FLAG ESCALATION${redFlagNotes ? `: ${redFlagNotes}` : ""}`
    : undefined;

  await prisma.opdVisit.update({
    where: { id: visitId },
    data: {
      stage: "with_doctor",
      exam: "done",
      ...(routingNote ? { routingNote } : {}),
      ...(hasRedFlags ? { notes: "[URGENT] Red flags reported at junior exam" } : {}),
    },
  });
  const updated = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (updated) await syncVisitFromOpdVisit(ctx, updated);

  if (hasRedFlags) {
    const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
    await writePlatformAudit({
      ctx,
      module: "frontdesk",
      action: "red_flag_escalation",
      entityType: "visit",
      entityId: visitId,
      summary: `Red flag escalation for ${patient?.name ?? "patient"} — ${redFlagNotes || "no notes"}`,
      payload: { redFlagNotes, visitId, patientId: visit.patientId },
    });
  }
}

async function assertSlotAvailable(
  ctx: ServerContext,
  doctorId: string,
  date: string,
  time: string,
  excludeAppointmentId?: string,
) {
  const scope = branchScope(ctx);
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      doctorId,
      date,
      time,
      status: { not: "cancelled" },
      ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
    },
  });
  if (conflict) {
    throw new ServerActionError(
      "SLOT_TAKEN",
      `This doctor already has an appointment at ${time} on ${date}. Choose another slot.`,
    );
  }
}

export async function cancelAppointment(ctx: ServerContext, appointmentId: string) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: scope.tenantId, branchId: scope.branchId },
  });
  if (!appt) throw new ServerActionError("NOT_FOUND", "Appointment not found.");
  if (appt.status === "cancelled") return { appointmentId, visitId: appt.visitId ?? "" };

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
    }),
    ...(appt.visitId
      ? [
          prisma.opdVisit.updateMany({
            where: { id: appt.visitId, stage: "registered" },
            data: { appointment: false, appointmentTime: null },
          }),
        ]
      : []),
  ]);

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "appointment_cancelled",
    entityType: "appointment",
    entityId: appointmentId,
    summary: `Cancelled appointment ${appointmentId}`,
  });

  return { appointmentId, visitId: appt.visitId ?? "" };
}

export async function rescheduleAppointment(
  ctx: ServerContext,
  appointmentId: string,
  input: { date: string; time: string; doctorId?: string; departmentId?: string },
) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: scope.tenantId, branchId: scope.branchId },
  });
  if (!appt) throw new ServerActionError("NOT_FOUND", "Appointment not found.");
  if (appt.status === "cancelled") {
    throw new ServerActionError("INVALID", "Cannot reschedule a cancelled appointment.");
  }

  const roster = await loadClinicalRoster(ctx);
  const doctorId = input.doctorId ?? appt.doctorId ?? roster.allDoctors[0]?.id ?? "";
  const deptId = input.departmentId ?? appt.departmentId ?? "dept_spine";
  const resolvedDoctorName = resolveDoctorName(doctorId, roster);

  if (await isDoctorOnLeave(doctorId, input.date)) {
    throw new ServerActionError(
      "DOCTOR_ON_LEAVE",
      `${resolvedDoctorName} is on approved leave on ${input.date}. Choose another doctor or date.`,
    );
  }

  await assertSlotAvailable(ctx, doctorId, input.date, input.time, appointmentId);

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: input.date,
        time: input.time,
        doctorId,
        doctorName: resolvedDoctorName,
        departmentId: deptId,
      },
    }),
    ...(appt.visitId
      ? [
          prisma.opdVisit.update({
            where: { id: appt.visitId },
            data: {
              appointmentTime: input.time,
              doctorId,
              doctorName: resolvedDoctorName,
              departmentId: deptId,
            },
          }),
        ]
      : []),
  ]);

  if (appt.visitId) {
    const opd = await prisma.opdVisit.findUnique({ where: { id: appt.visitId } });
    if (opd) await syncVisitFromOpdVisit(ctx, opd);
  }

  const patient = appt.patientId
    ? await prisma.patient.findUnique({ where: { id: appt.patientId } })
    : null;
  if (patient) {
    await notifyAppointmentReminder(ctx, {
      patientName: patient.name ?? "Patient",
      phone: patient.phone,
      time: `${input.date} ${input.time}`.trim(),
      visitId: appt.visitId ?? appointmentId,
    });
  }

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "appointment_rescheduled",
    entityType: "appointment",
    entityId: appointmentId,
    summary: `Rescheduled to ${input.date} ${input.time}`,
  });

  return { appointmentId, visitId: appt.visitId ?? "" };
}

export async function updatePatient(
  ctx: ServerContext,
  patientId: string,
  data: RegisterInput,
) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const existing = await prisma.patient.findFirst({
    where: { id: patientId, tenantId: scope.tenantId, branchId: scope.branchId },
  });
  if (!existing) throw new ServerActionError("NOT_FOUND", "Patient not found.");

  const deptId = String(data.department ?? existing.departmentId ?? "dept_spine");
  const first = String(data.firstName ?? "").trim();
  const last = String(data.lastName ?? "").trim();
  const name = `${first} ${last}`.trim() || existing.name || "Patient";
  const phone = String(data.phone ?? existing.phone);
  const uhid = existing.uhid;

  await assertNoDuplicatePatient(ctx, phone, uhid, patientId);
  const registration = buildPatientRegistrationPayload(data);

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      name,
      fullName: name,
      phone,
      email: String(data.email ?? "") || null,
      age: data.dob ? ageFromDob(String(data.dob)) : existing.age,
      gender: String(data.gender ?? existing.gender ?? "O"),
      department: deptLabel(deptId),
      departmentId: deptId,
      tags: registration.tags,
      referrer: registration.referrer,
      meta: registration.meta,
    },
  });

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "patient_updated",
    entityType: "patient",
    entityId: patientId,
    summary: `Updated patient ${name} (${uhid})`,
  });

  return { patientId, uhid };
}

export async function bookAppointment(
  ctx: ServerContext,
  input: { data: AppointmentInput; appointmentId: string; visitId: string },
) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const { data, appointmentId, visitId } = input;
  const patients = await prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } });
  const mappedPatients: Patient[] = patients.map(mapPrismaPatientRow);

  const patient =
    matchPatientByQuery(mappedPatients, String(data.patient ?? "")) ??
    mappedPatients.find((p) =>
      patientDisplayName(p).toLowerCase().includes(String(data.patient ?? "").toLowerCase()),
    );

  if (!patient) return { appointmentId: "", visitId: "", error: "Patient not found" };

  const roster = await loadClinicalRoster(ctx);
  const doctorId = String(data.doctor ?? roster.allDoctors[0]?.id ?? "dr_1");
  const deptId = String(data.department ?? "dept_spine");
  const resolvedDoctorName = resolveDoctorName(doctorId, roster);

  const apptDate = String(data.date ?? new Date().toISOString().slice(0, 10));
  if (await isDoctorOnLeave(doctorId, apptDate)) {
    return {
      appointmentId: "",
      visitId: "",
      error: `${resolvedDoctorName} is on approved leave on ${apptDate}. Choose another doctor or date.`,
    };
  }

  const apptTime = String(data.time ?? "");
  try {
    await assertSlotAvailable(ctx, doctorId, apptDate, apptTime);
  } catch (err) {
    const message = err instanceof ServerActionError ? err.message : "Slot unavailable.";
    return { appointmentId: "", visitId: "", error: message };
  }

  await prisma.$transaction([
    prisma.opdVisit.upsert({
      where: { id: visitId },
      update: {
        patientId: patient.id,
        stage: "registered",
        departmentId: deptId,
        doctorId,
        doctorName: resolvedDoctorName,
        billing: "pending",
        exam: "not_started",
        appointment: true,
        appointmentTime: String(data.time ?? ""),
        waitMin: 0,
      },
      create: {
        id: visitId,
        ...scope,
        patientId: patient.id,
        stage: "registered",
        departmentId: deptId,
        doctorId,
        doctorName: resolvedDoctorName,
        billing: "pending",
        exam: "not_started",
        appointment: true,
        appointmentTime: String(data.time ?? ""),
        waitMin: 0,
      },
    }),
    prisma.appointment.upsert({
      where: { id: appointmentId },
      update: {
        ...scope,
        patientId: patient.id,
        visitId,
        departmentId: deptId,
        doctorId,
        doctorName: resolvedDoctorName,
        date: String(data.date ?? ""),
        time: String(data.time ?? ""),
        durationMin: Number(data.duration ?? 20),
        notes: String(data.notes ?? "") || null,
        status: "booked",
      },
      create: {
        id: appointmentId,
        ...scope,
        patientId: patient.id,
        visitId,
        departmentId: deptId,
        doctorId,
        doctorName: resolvedDoctorName,
        date: String(data.date ?? ""),
        time: String(data.time ?? ""),
        durationMin: Number(data.duration ?? 20),
        notes: String(data.notes ?? "") || null,
        status: "booked",
      },
    }),
  ]);

  const opd = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (opd) await syncVisitFromOpdVisit(ctx, opd);

  await notifyAppointmentReminder(ctx, {
    patientName: patient.name,
    phone: patient.phone,
    time: `${String(data.date ?? "")} ${String(data.time ?? "")}`.trim(),
    visitId,
  });

  return { appointmentId, visitId };
}

async function isDoctorOnLeave(doctorId: string, date: string): Promise<boolean> {
  const hrEmail = DOCTOR_HR_EMAIL_MAP[doctorId];
  if (hrEmail) {
    const hrEmp = await prisma.hrEmployee.findFirst({
      where: { email: hrEmail.trim().toLowerCase(), active: true },
    });
    if (hrEmp) {
      const leave = await prisma.hrLeaveRequest.findFirst({
        where: {
          employeeId: hrEmp.id,
          status: "approved",
          fromDate: { lte: date },
          toDate: { gte: date },
        },
      });
      if (leave) return true;
    }
  }

  const staffId = staffIdFromDoctorId(doctorId);
  if (!staffId) return false;
  const staff = await prisma.adminStaff.findUnique({ where: { id: staffId } });
  if (!staff?.email) return false;
  const hrEmp = await prisma.hrEmployee.findFirst({
    where: { email: staff.email.trim().toLowerCase(), active: true },
  });
  if (!hrEmp) return false;
  const leave = await prisma.hrLeaveRequest.findFirst({
    where: {
      employeeId: hrEmp.id,
      status: "approved",
      fromDate: { lte: date },
      toDate: { gte: date },
    },
  });
  return !!leave;
}

export async function searchPatientsPaginated(
  ctx: ServerContext,
  input: { q?: string; page?: number; pageSize?: number; view?: "all" | "balance" | "today" },
) {
  await ensureHospitalBootstrap();
  const scope = branchScope(ctx);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 25));
  const q = input.q?.trim();

  let patientIdsFilter: string[] | undefined;
  if (input.view === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const visits = await prisma.opdVisit.findMany({
      where: {
        ...scope,
        checkInAt: { not: null },
        updatedAt: { gte: todayStart },
      },
      select: { patientId: true },
    });
    patientIdsFilter = [...new Set(visits.map((v) => v.patientId))];
    if (patientIdsFilter.length === 0) {
      return { patients: [], total: 0, page, pageSize };
    }
  }

  const where = {
    tenantId: scope.tenantId,
    branchId: scope.branchId,
    ...(input.view === "balance" ? { balance: { gt: 0 } } : {}),
    ...(patientIdsFilter ? { id: { in: patientIdsFilter } } : {}),
    ...(q
      ? {
          OR: [
            { uhid: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { fullName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    patients: rows.map(mapPrismaPatientRow),
    total,
    page,
    pageSize,
  };
}

export async function listFrontdeskAuditLogs(
  ctx: ServerContext,
  input: { limit?: number; cursor?: string },
) {
  const limit = Math.min(100, Math.max(10, input.limit ?? 50));
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      module: "frontdesk",
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actor: r.actor,
    actorRole: r.actorRole ?? "",
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    severity: r.severity,
  }));
}
