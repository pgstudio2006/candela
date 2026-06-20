import { prisma } from "@/lib/prisma";
import { DEFAULT_DOCUMENT_TEMPLATES } from "@/design-system/document-templates";
import { DOCTOR_TEMPLATES } from "@/design-system/doctor-data";
import {
  SEED_ADMIN_SETTINGS,
  SEED_DEPARTMENTS,
  SEED_STAFF,
} from "@/design-system/admin-data";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

const ADMIN_SETTINGS_ID = "admin_settings";

/** Production-safe bootstrap: document templates only unless demo seed enabled. */
export async function ensureHospitalBootstrap() {
  if (isDemoSeedEnabled()) {
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

  if (!(await prisma.documentTemplate.count())) {
    for (const template of DEFAULT_DOCUMENT_TEMPLATES) {
      await prisma.documentTemplate.create({ data: template }).catch(() => undefined);
    }
  }

  if (!(await prisma.doctorTemplate.count())) {
    for (const template of DOCTOR_TEMPLATES) {
      await prisma.doctorTemplate.create({
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
      }).catch(() => undefined);
    }
  }

  // Demo-only extended bootstrap is handled elsewhere
  if (isDemoSeedEnabled()) {
    return;
  }
}

export { ADMIN_SETTINGS_ID };
