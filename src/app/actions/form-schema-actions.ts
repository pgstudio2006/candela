"use server";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCorruptSchemaOverride } from "@/lib/schema-registry";
import { runAction, type ActionResult } from "@/server/action-result";

/** Load published form schemas for any authenticated workspace */
export async function getPublishedFormSchemasAction(): Promise<
  ActionResult<Partial<Record<string, FormSchema>>>
> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return {};
    const rows = await prisma.formSchemaOverride.findMany();
    const entries: [string, FormSchema][] = [];
    for (const row of rows) {
      const schema = { ...(row.payload as FormSchema), id: row.schemaId };
      if (isCorruptSchemaOverride(row.schemaId, schema)) continue;
      entries.push([row.schemaId, schema]);
    }
    return Object.fromEntries(entries);
  });
}
