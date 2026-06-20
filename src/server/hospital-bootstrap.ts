import { prisma } from "@/lib/prisma";
import { DEFAULT_DOCUMENT_TEMPLATES } from "@/design-system/document-templates";
import {
  SEED_ADMIN_SETTINGS,
  SEED_DEPARTMENTS,
  SEED_STAFF,
} from "@/design-system/admin-data";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

const ADMIN_SETTINGS_ID = "admin_settings";

/** Production-safe bootstrap: departments, doctors, settings — no demo patients. */
export async function ensureHospitalBootstrap() {
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

  await prisma.adminSetting.upsert({
    where: { id: ADMIN_SETTINGS_ID },
    update: {},
    create: {
      id: ADMIN_SETTINGS_ID,
      ...SEED_ADMIN_SETTINGS,
      resolvedLeakageIds: [],
    },
  });

  if (!(await prisma.documentTemplate.count())) {
    for (const template of DEFAULT_DOCUMENT_TEMPLATES) {
      await prisma.documentTemplate.create({ data: template }).catch(() => undefined);
    }
  }

  // Demo-only extended bootstrap is handled elsewhere
  if (isDemoSeedEnabled()) {
    return;
  }
}

export { ADMIN_SETTINGS_ID };
