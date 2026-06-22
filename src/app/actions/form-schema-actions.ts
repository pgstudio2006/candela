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
    const entries = rows
      .filter((row) => {
        if (row.schemaId !== "registration") return true;
        const schema = row.payload as FormSchema;
        return schema.sections.some((section) =>
          section.fields.some((field) => field.id === "fullName"),
        );
      })
      .map((x) => [x.schemaId, x.payload as FormSchema]);
    return Object.fromEntries(entries);
  });
}
