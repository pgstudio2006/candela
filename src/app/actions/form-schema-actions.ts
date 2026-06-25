"use server";

import { auth } from "@/auth";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { loadValidSchemaOverrides } from "@/server/form-schema-overrides";
import { runAction, type ActionResult } from "@/server/action-result";

/** Load published form schemas for any authenticated workspace */
export async function getPublishedFormSchemasAction(): Promise<
  ActionResult<Partial<Record<string, FormSchema>>>
> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return {};
    const { overrides } = await loadValidSchemaOverrides(true);
    return overrides;
  });
}
