import { prisma } from "@/lib/prisma";
import { SEED_DEPARTMENTS, SEED_STAFF } from "@/design-system/admin-data";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

/** Demo-only admin staff/departments — never runs unless ALLOW_DEMO_SEED=true. */
export async function seedDemoAdminBundle() {
  if (!isDemoSeedEnabled()) return;

  if (!(await prisma.adminStaff.count())) {
    await prisma.adminStaff.createMany({
      data: SEED_STAFF.map((x) => ({
        ...x,
        departmentIds: x.departmentIds,
      })),
      skipDuplicates: true,
    });
  }

  if (!(await prisma.adminDepartment.count())) {
    await prisma.adminDepartment.createMany({
      data: SEED_DEPARTMENTS.map((x) => ({
        ...x,
        doctorIds: x.doctorIds,
        defaultPackageIds: x.defaultPackageIds,
        bays: x.bays,
      })),
      skipDuplicates: true,
    });
  }
}
