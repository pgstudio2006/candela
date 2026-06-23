import { prisma } from "@/lib/prisma";
import { doctorIdFromStaffId } from "@/lib/healthcare-roles";

export async function syncDoctorToDepartments(staffId: string, departmentIds: string[]) {
  if (!departmentIds.length) return;
  const drId = doctorIdFromStaffId(staffId);
  for (const deptId of departmentIds) {
    const dept = await prisma.adminDepartment.findUnique({ where: { id: deptId } });
    if (!dept) continue;
    const doctorIds = Array.isArray(dept.doctorIds) ? [...dept.doctorIds] : [];
    if (!doctorIds.includes(drId)) {
      await prisma.adminDepartment.update({
        where: { id: deptId },
        data: { doctorIds: [...doctorIds, drId] },
      });
    }
  }
}
