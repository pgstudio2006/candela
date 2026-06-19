"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getIcdOptionsAction() {
  const session = await auth();
  if (!session?.user) return [];
  const nodes = await prisma.adminDiseaseNode.findMany({ orderBy: { label: "asc" } });
  return nodes.map((n) => ({
    value: n.icd,
    label: `${n.icd} — ${n.label}`,
    id: n.id,
  }));
}

export async function getCarePackagesAction() {
  const session = await auth();
  if (!session?.user) return [];
  const { CARE_PACKAGES } = await import("@/design-system/doctor-data");
  const depts = await prisma.adminDepartment.findMany({ where: { active: true } });
  const ids = new Set(depts.flatMap((d) => (Array.isArray(d.defaultPackageIds) ? d.defaultPackageIds : [])));
  const fromSeed = CARE_PACKAGES.filter((p) => ids.has(p.id) || ids.size === 0);
  return fromSeed.length ? fromSeed : CARE_PACKAGES;
}
