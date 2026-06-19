"use server";

import { prisma } from "@/lib/prisma";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { auth } from "@/auth";

/** Load published form schemas for any authenticated workspace */
export async function getPublishedFormSchemasAction(): Promise<Partial<Record<string, FormSchema>>> {
  const session = await auth();
  if (!session?.user) return {};
  const rows = await prisma.formSchemaOverride.findMany();
  return Object.fromEntries(rows.map((x) => [x.schemaId, x.payload as FormSchema]));
}
