// @ts-nocheck
import { Prisma } from "@prisma/client";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import { DOCTOR_TEMPLATES, IPD_PATIENTS } from "@/design-system/doctor-data";
import { DEFAULT_DOCUMENT_TEMPLATES } from "@/design-system/document-templates";
import { PATIENTS as SEED_PATIENTS, VISITS as SEED_VISITS, type Patient, type Visit } from "@/design-system/frontdesk-data";
import type { Appointment, FormSubmission, FrontdeskCounters } from "@/lib/frontdesk-workflow";
import { ageFromDob, deptLabel, doctorName, matchPatientByQuery, nextUhid, nowTime, templateAmount } from "@/lib/frontdesk-workflow";
import { billingFromPayment, resolveOpdFirstRoute, resolvePostCounselRoute, treatmentPathFromConvert, type PaymentScope } from "@/lib/billing-routing";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { upsertVisitInvoice } from "@/server/invoicing";
import { writePlatformAudit } from "@/server/platform-audit";
import { branchScope } from "@/server/tenancy";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";

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
};

export type ClinicalSnapshot = {
  patients: Patient[];
  visits: Visit[];
  appointments: Appointment[];
  submissions: FormSubmission[];
  counters: FrontdeskCounters;
  billingHandoffs: BillingHandoffPayload[];
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
  departmentId: string;
  doctorId: string;
  doctorName: string;
  billing: string;
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
}): Visit {
  return {
    id: row.id,
    patientId: row.patientId,
    token: row.token ?? undefined,
    stage: (row.stage ?? "registered") as Visit["stage"],
    departmentId: row.departmentId,
    doctorId: row.doctorId || "dr_1",
    doctorName: row.doctorName,
    billing: row.billing as Visit["billing"],
    exam: (row.exam ?? "not_started") as Visit["exam"],
    appointment: row.appointment,
    appointmentTime: row.appointmentTime ?? undefined,
    waitMin: row.waitMin,
    checkInAt: row.checkInAt ?? undefined,
    billAmount: row.billAmount ?? undefined,
    amountPaid: row.amountPaid ?? undefined,
    balanceDue: row.balanceDue ?? undefined,
    treatmentPath: (row.treatmentPath as Visit["treatmentPath"]) ?? undefined,
    ipdAdmissionId: row.ipdAdmissionId ?? undefined,
    counselPackageLabel: row.counselPackageLabel ?? undefined,
    deferredReason: row.deferredReason ?? undefined,
    routingNote: row.routingNote ?? undefined,
  };
}

async function ensureClinicalSeed() {
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
}

async function assertNoDuplicatePatient(
  ctx: ServerContext,
  phone: string,
  uhid: string,
  excludeId?: string,
  force = false,
) {
  if (force) return;
  const scope = branchScope(ctx);
  const phoneDigits = phone.replace(/\D/g, "").slice(-10);
  const existing = await prisma.patient.findFirst({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: [
        { uhid },
        ...(phoneDigits.length >= 10 ? [{ phone: { endsWith: phoneDigits } }] : []),
      ],
    },
  });
  if (existing) {
    throw new ServerActionError(
      "DUPLICATE_PATIENT",
      `Patient already registered: ${existing.name ?? "Unknown"} (${existing.uhid}). Use supervisor override to proceed.`,
    );
  }
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
  await ensureClinicalSeed();
  await backfillBranchScope(ctx);
  const scope = branchScope(ctx);

  const [patientsRows, visitsRows, appointmentRows, submissionRows, handoffRows] = await Promise.all([
    prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } }),
    prisma.opdVisit.findMany({ where: scope, orderBy: { createdAt: "asc" } }),
    prisma.appointment.findMany({ where: { branchId: scope.branchId }, orderBy: { createdAt: "asc" } }),
    prisma.formSubmission.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.billingHandoff.findMany({ where: { branchId: scope.branchId }, orderBy: { createdAt: "asc" } }),
  ]);

  const patients: Patient[] = patientsRows.map((row) => ({
    id: row.id,
    uhid: row.uhid,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    age: row.age,
    gender: row.gender as Patient["gender"],
    department: row.department,
    departmentId: row.departmentId,
    tags: asStringArray(row.tags),
    balance: row.balance,
    lastVisit: row.lastVisit ?? undefined,
    referrer: row.referrer ?? undefined,
  }));

  const visits: Visit[] = visitsRows.map(mapVisit);

  const appointments: Appointment[] = appointmentRows.map((row) => ({
    id: row.id,
    patientId: row.patientId,
    departmentId: row.departmentId,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    date: row.date,
    time: row.time,
    durationMin: row.durationMin,
    notes: row.notes ?? undefined,
    status: row.status as Appointment["status"],
  }));

  const submissions: FormSubmission[] = submissionRows.map((row) => ({
    id: row.id,
    formId: row.formId,
    patientId: row.patientId ?? undefined,
    visitId: row.visitId ?? undefined,
    data: asUnknownRecord(row.data),
    submittedAt: row.submittedAt,
  }));

  const billingHandoffs: BillingHandoffPayload[] = handoffRows.map((row) => ({
    visitId: row.visitId,
    patientId: row.patientId,
    patientName: row.patientName,
    uhid: row.uhid,
    quote: row.quote as BillingHandoffPayload["quote"],
    counsellorName: row.counsellorName,
    counselNotes: row.counselNotes,
    doctorName: row.doctorName,
    doctorId: row.doctorId,
    sentAt: row.sentAt,
    paymentExpectation: row.paymentExpectation as BillingHandoffPayload["paymentExpectation"],
    treatmentMode: row.treatmentMode as BillingHandoffPayload["treatmentMode"],
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
  };
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
  await ensureClinicalSeed();
  const { data, patientId, visitId, startVisit = true, forceDuplicate = false } = input;
  const scope = branchScope(ctx);
  const current = await getClinicalSnapshot(ctx);
  const uhid = data.uhid ? String(data.uhid) : nextUhid(current.counters.patient + 1);
  const deptId = String(data.department ?? "dept_spine");
  const first = String(data.firstName ?? "").trim();
  const last = String(data.lastName ?? "").trim();
  const name = `${first} ${last}`.trim() || "New Patient";
  const phone = String(data.phone ?? "");

  await assertNoDuplicatePatient(ctx, phone, uhid, patientId, forceDuplicate);

  await prisma.patient.upsert({
    where: { id: patientId },
    update: {
      uhid,
      name,
      fullName: name,
      phone,
      email: String(data.email ?? "") || null,
      age: data.dob ? ageFromDob(String(data.dob)) : 0,
      gender: String(data.gender ?? "O"),
      department: deptLabel(deptId),
      departmentId: deptId,
      tags: [String(data.visitType ?? "opd")],
      referrer: String(data.referrerName ?? "") || null,
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
      age: data.dob ? ageFromDob(String(data.dob)) : 0,
      gender: String(data.gender ?? "O"),
      department: deptLabel(deptId),
      departmentId: deptId,
      tags: [String(data.visitType ?? "opd")],
      referrer: String(data.referrerName ?? "") || null,
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
    action: "patient_registered",
    entityType: "patient",
    entityId: patientId,
    summary: `Registered ${name} (${uhid})`,
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
  const patients = (
    await prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } })
  ).map((row) => ({
    id: row.id,
    uhid: row.uhid,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    age: row.age,
    gender: row.gender as Patient["gender"],
    department: row.department,
    departmentId: row.departmentId,
    tags: asStringArray(row.tags),
    balance: row.balance,
    lastVisit: row.lastVisit ?? undefined,
    referrer: row.referrer ?? undefined,
  }));

  const query = String(data.uhid ?? "");
  const patient = matchPatientByQuery(patients, query);
  if (!patient) return { visitId: existingVisitId ?? "", patientId: "" };

  const doctorId = String(data.doctor ?? "dr_1");
  const deptId = String(data.department ?? patient.departmentId);
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
        doctorName: doctorName(doctorId),
        checkInAt: nowTime(),
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
      doctorName: doctorName(doctorId),
      billing: "pending",
      exam: "not_started",
      appointment: false,
      waitMin: 0,
      checkInAt: nowTime(),
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
  const visit = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (!visit) {
    return { routeHref: "/app/frontdesk/queue", routingLabel: "Visit missing", routingNote: "Visit not found." };
  }

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
  const token = (maxToken._max.token ?? 0) + 1;

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
        token: route.stage === "queued" ? token : visit.token,
        billAmount: net,
        amountPaid: collected,
        balanceDue: balanceDue > 0 ? balanceDue : null,
        treatmentPath: "opd",
        routingNote: route.routingNote,
        deferredReason: route.billing === "deferred" ? String(data.deferReason ?? "") : null,
        waitMin: 0,
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

  return { routeHref: route.routeHref, routingLabel: route.routingLabel, routingNote: route.routingNote };
}

export async function processCounselBilling(
  ctx: ServerContext,
  visitId: string,
  input: CounselBillingInput,
): Promise<BillingResult> {
  await ensureClinicalSeed();
  const visit = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (!visit) {
    return { routeHref: "/app/frontdesk/billing", routingLabel: "Visit missing", routingNote: "Visit not found." };
  }

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

  return { routeHref: route.routeHref, routingLabel: route.routingLabel, routingNote: route.routingNote };
}

export async function completeJuniorExam(ctx: ServerContext, visitId: string) {
  await ensureClinicalSeed();
  await prisma.opdVisit.update({
    where: { id: visitId },
    data: {
      stage: "with_doctor",
      exam: "done",
    },
  });
  const updated = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (updated) await syncVisitFromOpdVisit(ctx, updated);
}

export async function bookAppointment(
  ctx: ServerContext,
  input: { data: AppointmentInput; appointmentId: string; visitId: string },
) {
  await ensureClinicalSeed();
  const scope = branchScope(ctx);
  const { data, appointmentId, visitId } = input;
  const patients = await prisma.patient.findMany({ where: scope, orderBy: { createdAt: "asc" } });
  const mappedPatients: Patient[] = patients.map((p) => ({
    id: p.id,
    uhid: p.uhid,
    name: p.name,
    phone: p.phone,
    email: p.email ?? undefined,
    age: p.age,
    gender: p.gender as Patient["gender"],
    department: p.department,
    departmentId: p.departmentId,
    tags: asStringArray(p.tags),
    balance: p.balance,
    lastVisit: p.lastVisit ?? undefined,
    referrer: p.referrer ?? undefined,
  }));

  const patient =
    matchPatientByQuery(mappedPatients, String(data.patient ?? "")) ??
    mappedPatients.find((p) => p.name.toLowerCase().includes(String(data.patient ?? "").toLowerCase()));

  if (!patient) return { appointmentId: "", visitId: "" };

  const doctorId = String(data.doctor ?? "dr_1");
  const deptId = String(data.department ?? "dept_spine");

  await prisma.$transaction([
    prisma.opdVisit.upsert({
      where: { id: visitId },
      update: {
        patientId: patient.id,
        stage: "registered",
        departmentId: deptId,
        doctorId,
        doctorName: doctorName(doctorId),
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
        doctorName: doctorName(doctorId),
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
        patientId: patient.id,
        visitId,
        departmentId: deptId,
        doctorId,
        doctorName: doctorName(doctorId),
        date: String(data.date ?? ""),
        time: String(data.time ?? ""),
        durationMin: Number(data.duration ?? 20),
        notes: String(data.notes ?? "") || null,
        status: "booked",
      },
      create: {
        id: appointmentId,
        patientId: patient.id,
        visitId,
        departmentId: deptId,
        doctorId,
        doctorName: doctorName(doctorId),
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

  return { appointmentId, visitId };
}
