import { prisma } from "@/lib/prisma";
import type {
  IpdAdmissionDetail,
  IpdAdmissionInput,
  IpdAdmissionStatus,
  IpdBedSummary,
  IpdBillingMode,
  IpdPatientType,
  IpdSnapshot,
  IpdWard,
} from "@/design-system/ipd-data";
import { IPD_WARD_OPTIONS } from "@/design-system/ipd-data";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { branchScope } from "@/server/tenancy";
import { writePlatformAudit } from "@/server/platform-audit";
import { ensureHospitalBootstrap } from "@/server/hospital-bootstrap";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";
import { createId } from "@/lib/id";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
import { resolveDoctorName } from "@/lib/clinical-roster";
import { backfillBranchScope } from "@/server/branch-scope";
import { loadClinicalRoster } from "@/server/clinical/roster";

export type { IpdSnapshot } from "@/design-system/ipd-data";

export async function getIpdSnapshot(ctx: ServerContext): Promise<IpdSnapshot> {
  await ensureHospitalBootstrap();
  await backfillBranchScope(ctx);
  const scope = branchScope(ctx);

  const admissions = await prisma.ipdAdmission.findMany({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      status: { in: ["admitted", "discharge_planned"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const patientIds = admissions.map((a) => a.patientId);
  const patients = patientIds.length
    ? await prisma.patient.findMany({
        where: { id: { in: patientIds }, tenantId: scope.tenantId, branchId: scope.branchId },
        select: { id: true, name: true, fullName: true, uhid: true },
      })
    : [];
  const patientById = new Map(patients.map((p) => [p.id, p]));

  const doctorIds = admissions.map((a) => a.attendingDoctorId).filter(Boolean);
  const doctors = doctorIds.length
    ? await prisma.adminStaff.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, name: true },
      })
    : [];
  const doctorById = new Map(doctors.map((d) => [d.id, d]));

  const occupiedByBed = new Map(
    admissions.map((a) => [`${a.ward}:${a.bed}`, a]),
  );

  const wards: IpdBedSummary[] = IPD_WARD_OPTIONS.map((ward) => {
    const beds = ward.beds.map((bedLabel) => {
      const admission = occupiedByBed.get(`${ward.label}:${bedLabel}`);
      const patient = admission ? patientById.get(admission.patientId) : undefined;
      const doctor = admission ? doctorById.get(admission.attendingDoctorId) : undefined;
      return {
        id: bedLabel,
        label: bedLabel,
        occupied: Boolean(admission),
        admission: admission
          ? {
              id: admission.id,
              patientId: admission.patientId,
              patientName: (patient ? patientDisplayName(patient) : undefined) ?? admission.patientId,
              doctorName: doctor?.name ?? admission.attendingDoctorId,
              diagnosis: admission.diagnosis,
              status: admission.status as IpdAdmissionStatus,
              admittedAt: admission.admittedAt,
              expectedDischarge: admission.expectedDischarge ?? undefined,
            }
          : undefined,
      };
    });
    return {
      wardId: ward.id,
      ward: ward.label,
      category: ward.category,
      beds,
    };
  });

  const totalBeds = wards.reduce((sum, w) => sum + w.beds.length, 0);
  const occupiedBeds = wards.reduce((sum, w) => sum + w.beds.filter((b) => b.occupied).length, 0);

  const [registeredPatients, roster] = await Promise.all([
    prisma.patient.findMany({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      select: { id: true, name: true, fullName: true, uhid: true, phone: true },
      orderBy: { createdAt: "desc" },
    }),
    loadClinicalRoster(ctx),
  ]);

  const patientOptions = registeredPatients.map((p) => ({
    id: p.id,
    name: patientDisplayName(p),
    uhid: p.uhid,
    phone: p.phone ?? "",
  }));

  const doctorOptions = roster.allDoctors.map((d) => ({ id: d.id, name: d.name }));

  const departmentOptions = roster.departments.map((d) => ({
    id: d.id,
    label: d.label,
  }));

  return {
    wards,
    totalBeds,
    occupiedBeds,
    freeBeds: totalBeds - occupiedBeds,
    patients: patientOptions,
    doctors: doctorOptions,
    departments: departmentOptions,
  };
}

export async function getIpdAdmission(ctx: ServerContext, id: string) {
  const scope = branchScope(ctx);
  const admission = await prisma.ipdAdmission.findFirst({
    where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
  });
  if (!admission) throw new ServerActionError("NOT_FOUND", "IPD admission not found.");

  const patient = await prisma.patient.findFirst({
    where: { id: admission.patientId, tenantId: scope.tenantId, branchId: scope.branchId },
    select: { id: true, name: true, fullName: true, uhid: true, phone: true, age: true, gender: true },
  });
  const doctor = await prisma.adminStaff.findFirst({
    where: { id: admission.attendingDoctorId },
    select: { id: true, name: true },
  });

  const detail: IpdAdmissionDetail = {
    ...admission,
    patientName: (patient ? patientDisplayName(patient) : undefined) ?? admission.patientId,
    uhid: patient?.uhid,
    phone: patient?.phone,
    age: patient?.age,
    gender: patient?.gender,
    doctorName: doctor?.name ?? admission.attendingDoctorId,
    patientType: (admission.patientType ?? "general") as IpdPatientType,
    billingMode: (admission.billingMode ?? "postpaid") as IpdBillingMode,
    status: admission.status as IpdAdmissionStatus,
  };
  return detail;
}

export async function admitPatient(ctx: ServerContext, input: IpdAdmissionInput) {
  await ensureHospitalBootstrap();
  const scope = branchScope(ctx);

  const ward = IPD_WARD_OPTIONS.find((w) => w.id === input.wardId);
  if (!ward) throw new ServerActionError("VALIDATION", "Ward not found.");
  if (!ward.beds.includes(input.bed)) throw new ServerActionError("VALIDATION", "Bed is not in selected ward.");

  if (!input.patientId?.trim()) throw new ServerActionError("VALIDATION", "Select a registered patient.");
  if (!input.doctorId?.trim()) throw new ServerActionError("VALIDATION", "Select an attending doctor.");
  if (!input.departmentId?.trim()) throw new ServerActionError("VALIDATION", "Select a department.");

  const existingOccupant = await prisma.ipdAdmission.findFirst({
    where: {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      ward: ward.label,
      bed: input.bed,
      status: { in: ["admitted", "discharge_planned"] },
    },
  });
  if (existingOccupant) {
    throw new ServerActionError("CONFLICT", "Selected bed is already occupied.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, tenantId: scope.tenantId, branchId: scope.branchId },
    select: { id: true, name: true, fullName: true },
  });
  if (!patient) throw new ServerActionError("NOT_FOUND", "Patient not found in this branch.");
  const patientName = patientDisplayName(patient) ?? input.patientId;

  const roster = await loadClinicalRoster(ctx);
  const doctorName = resolveDoctorName(input.doctorId, roster);
  const departmentLabel = roster.departments.find((d) => d.id === input.departmentId)?.label ?? input.departmentId;

  const visitId = createId("vis");
  const ipdId = `ipd_${visitId}`;
  const now = new Date().toISOString();
  const admittedAt = now.slice(0, 10);

  await prisma.$transaction(async (tx) => {
    await tx.opdVisit.create({
      data: {
        id: visitId,
        ...scope,
        patientId: input.patientId,
        stage: "ipd_admitted",
        departmentId: input.departmentId,
        doctorId: input.doctorId,
        doctorName,
        billing: "pending",
        exam: "not_started",
        appointment: false,
        waitMin: 0,
        checkInAt: now,
        treatmentPath: "ipd",
        ipdAdmissionId: ipdId,
        routingNote: `Direct IPD admission from front desk · ${departmentLabel}`,
      },
    });

    await tx.ipdAdmission.create({
      data: {
        id: ipdId,
        ...scope,
        visitId,
        patientId: input.patientId,
        ward: ward.label,
        bed: input.bed,
        category: ward.category,
        patientType: input.patientType,
        billingMode: input.billingMode,
        expectedDischarge: input.expectedDischarge,
        admittedAt,
        diagnosis: input.diagnosis,
        attendingDoctorId: input.doctorId,
        status: "admitted",
      },
    });
  });

  const opd = await prisma.opdVisit.findUnique({ where: { id: visitId } });
  if (opd) await syncVisitFromOpdVisit(ctx, opd);

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "ipd_admitted",
    entityType: "ipd_admission",
    entityId: ipdId,
    summary: `Admitted ${patientName} to ${ward.label} bed ${input.bed}`,
    payload: {
      ward: ward.label,
      bed: input.bed,
      patientType: input.patientType,
      billingMode: input.billingMode,
    },
  });

  return { id: ipdId, visitId, patientId: input.patientId };
}

export async function updateIpdAdmission(
  ctx: ServerContext,
  id: string,
  patch: {
    status?: IpdAdmissionStatus;
    expectedDischarge?: string;
    bed?: string;
    ward?: string;
    diagnosis?: string;
  },
) {
  const scope = branchScope(ctx);
  const existing = await prisma.ipdAdmission.findFirst({
    where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
  });
  if (!existing) throw new ServerActionError("NOT_FOUND", "IPD admission not found.");

  const data: Record<string, unknown> = {};
  if (patch.status) data.status = patch.status;
  if (patch.expectedDischarge !== undefined) data.expectedDischarge = patch.expectedDischarge;
  if (patch.diagnosis) data.diagnosis = patch.diagnosis;

  if (patch.bed && patch.ward && (patch.bed !== existing.bed || patch.ward !== existing.ward)) {
    const ward = IPD_WARD_OPTIONS.find((w) => w.label === patch.ward);
    if (!ward) throw new ServerActionError("VALIDATION", "Ward not found.");
    if (!ward.beds.includes(patch.bed)) throw new ServerActionError("VALIDATION", "Bed is not in selected ward.");
    const occupant = await prisma.ipdAdmission.findFirst({
      where: {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        ward: patch.ward,
        bed: patch.bed,
        status: { in: ["admitted", "discharge_planned"] },
        NOT: { id },
      },
    });
    if (occupant) throw new ServerActionError("CONFLICT", "Target bed is already occupied.");
    data.ward = patch.ward;
    data.bed = patch.bed;
    data.category = ward.category;
  }

  await prisma.ipdAdmission.update({
    where: { id },
    data,
  });

  await writePlatformAudit({
    ctx,
    module: "frontdesk",
    action: "ipd_updated",
    entityType: "ipd_admission",
    entityId: id,
    summary: `Updated IPD admission ${id}`,
    payload: patch,
  });

  return { id };
}
