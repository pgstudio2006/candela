import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { prisma } from "@/lib/prisma";
import { isCorruptSchemaOverride } from "@/lib/schema-registry";

export type ValidSchemaOverridesResult = {
  overrides: Record<string, FormSchema>;
  purgedIds: string[];
};

/** Load valid published schemas; optionally delete corrupt rows from the database. */
export async function loadValidSchemaOverrides(purge = false): Promise<ValidSchemaOverridesResult> {
  const rows = await prisma.formSchemaOverride.findMany();
  const overrides: Record<string, FormSchema> = {};
  const purgedIds: string[] = [];

  for (const row of rows) {
    const schema = { ...(row.payload as FormSchema), id: row.schemaId };
    if (isCorruptSchemaOverride(row.schemaId, schema)) {
      purgedIds.push(row.schemaId);
      continue;
    }
    overrides[row.schemaId] = schema;
  }

  if (purge && purgedIds.length > 0) {
    await prisma.formSchemaOverride.deleteMany({ where: { schemaId: { in: purgedIds } } });
  }

  return { overrides, purgedIds };
}
