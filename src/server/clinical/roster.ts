import { prisma } from "@/lib/prisma";
import { buildClinicalRoster, doctorIdFromStaffId, DOCTOR_LOGIN_EMAIL_MAP, type ClinicalRoster } from "@/lib/clinical-roster";
import type { ServerContext } from "@/server/context";

function parseArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function resolveDoctorIdForContext(ctx: ServerContext): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  const email = user?.email?.trim().toLowerCase();
  if (email && DOCTOR_LOGIN_EMAIL_MAP[email]) return DOCTOR_LOGIN_EMAIL_MAP[email];
  if (!email) return "dr_1";
  const staff = await prisma.adminStaff.findFirst({
    where: { email, role: "doctor" },
  });
  if (staff) return doctorIdFromStaffId(staff.id);
  return DOCTOR_LOGIN_EMAIL_MAP[email] ?? "dr_1";
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
    staff.map((s) => ({ id: s.id, name: s.name, role: s.role })),
  );
}
