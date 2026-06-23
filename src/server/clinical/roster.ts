import { prisma } from "@/lib/prisma";
import {
  buildClinicalRoster,
  doctorIdFromStaffId,
  DOCTOR_LOGIN_EMAIL_MAP,
  type ClinicalRoster,
} from "@/lib/clinical-roster";
import type { DoctorProfile } from "@/design-system/doctor-data";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";

function parseArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function resolveDoctorProfile(ctx: ServerContext): Promise<DoctorProfile> {
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  const email = user?.email?.trim().toLowerCase();
  if (!email) {
    throw new ServerActionError("UNAUTHORIZED", "Doctor login not linked to a user account.");
  }

  const legacyDoctorId = DOCTOR_LOGIN_EMAIL_MAP[email];
  const departments = await prisma.adminDepartment.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });

  let staff = await prisma.adminStaff.findFirst({
    where: { email, role: "doctor", branchId: ctx.branchId },
  });
  if (!staff) {
    staff = await prisma.adminStaff.findFirst({
      where: { email, role: "doctor" },
    });
  }

  if (legacyDoctorId) {
    const departmentIds = staff ? parseArray(staff.departmentIds) : [];
    const departmentLabels = departmentIds.map(
      (id) => departments.find((d) => d.id === id)?.label ?? id,
    );
    return {
      doctorId: legacyDoctorId,
      staffId: staff?.id ?? "",
      name: staff?.name ?? user?.name ?? "Doctor",
      email,
      departmentIds,
      departmentLabels,
    };
  }

  if (!staff) {
    throw new ServerActionError(
      "FORBIDDEN",
      "No doctor profile is linked to this login. Ask your admin to add you under Staff & access with the Doctor role.",
    );
  }

  const departmentIds = parseArray(staff.departmentIds);
  const departmentLabels = departmentIds.map(
    (id) => departments.find((d) => d.id === id)?.label ?? id,
  );

  return {
    doctorId: doctorIdFromStaffId(staff.id),
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    departmentIds,
    departmentLabels,
    licenseNo: staff.licenseNo ?? undefined,
  };
}

export async function resolveDoctorIdForContext(ctx: ServerContext): Promise<string> {
  const profile = await resolveDoctorProfile(ctx);
  return profile.doctorId;
}

export async function loadClinicalRoster(_ctx: ServerContext): Promise<ClinicalRoster> {
  const [departments, staff] = await Promise.all([
    prisma.adminDepartment.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.adminStaff.findMany({ where: { role: "doctor" }, orderBy: { name: "asc" } }),
  ]);

  return buildClinicalRoster(
    departments.map((d) => ({
      id: d.id,
      label: d.label,
      doctorIds: parseArray(d.doctorIds),
      active: d.active,
    })),
    staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      departmentIds: parseArray(s.departmentIds),
    })),
  );
}
