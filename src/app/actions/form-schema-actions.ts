"use server";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runAction, type ActionResult } from "@/server/action-result";

/** Load published form schemas for any authenticated workspace */
export async function getPublishedFormSchemasAction(): Promise<
  ActionResult<Partial<Record<string, FormSchema>>>
> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return {};
    const rows = await prisma.formSchemaOverride.findMany();
    return Object.fromEntries(rows.map((x) => [x.schemaId, x.payload as FormSchema]));
  });
}
