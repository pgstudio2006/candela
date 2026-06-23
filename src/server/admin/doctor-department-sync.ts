import { prisma } from "@/lib/prisma";
import { doctorIdFromStaffId } from "@/lib/healthcare-roles";
import { stripLegacyDemoDoctorIds } from "@/lib/legacy-demo-doctors";

function parseDoctorIds(value: unknown): string[] {
  return stripLegacyDemoDoctorIds(Array.isArray(value) ? value.map(String) : []);
}

/** Keep department doctor lists aligned with staff doctor assignments (all branches). */
export async function syncDoctorToDepartments(staffId: string, departmentIds: string[]) {
  const drId = doctorIdFromStaffId(staffId);
  const departments = await prisma.adminDepartment.findMany();
  const targetDeptIds = new Set(departmentIds);

  for (const dept of departments) {
    const current = parseDoctorIds(dept.doctorIds);
    const shouldHave = targetDeptIds.has(dept.id);
    const has = current.includes(drId);

    let next = current;
    if (shouldHave && !has) {
      next = [...current, drId];
    } else if (!shouldHave && has) {
      next = current.filter((id) => id !== drId);
    }

    if (next.length !== current.length || next.some((id, i) => id !== current[i])) {
      await prisma.adminDepartment.update({
        where: { id: dept.id },
        data: { doctorIds: next },
      });
    }
  }
}

/** Remove a doctor id from every department (tenant-wide). */
export async function removeDoctorFromAllDepartments(doctorId: string) {
  const departments = await prisma.adminDepartment.findMany();
  for (const dept of departments) {
    const current = parseDoctorIds(dept.doctorIds);
    if (!current.includes(doctorId)) continue;
    await prisma.adminDepartment.update({
      where: { id: dept.id },
      data: { doctorIds: current.filter((id) => id !== doctorId) },
    });
  }
}

/** One-time hygiene: drop legacy demo doctor ids from all departments. */
export async function stripLegacyDemoDoctorsFromDepartments() {
  const departments = await prisma.adminDepartment.findMany();
  for (const dept of departments) {
    const current = parseDoctorIds(dept.doctorIds);
    const raw = Array.isArray(dept.doctorIds) ? dept.doctorIds.map(String) : [];
    if (raw.length === current.length) continue;
    await prisma.adminDepartment.update({
      where: { id: dept.id },
      data: { doctorIds: current },
    });
  }
}
