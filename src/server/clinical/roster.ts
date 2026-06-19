import { prisma } from "@/lib/prisma";
import { buildClinicalRoster, type ClinicalRoster } from "@/lib/clinical-roster";
import type { ServerContext } from "@/server/context";

function parseArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
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
