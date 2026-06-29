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
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: { amount: "asc" },
  });
  return packages.map((pkg) => ({
    id: pkg.id,
    label: pkg.label,
    amount: Number(pkg.amount),
    sessions: pkg.sessions ?? 6,
    dept: pkg.dept ?? "dept_general",
  }));
}
