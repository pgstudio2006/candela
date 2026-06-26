import type { FormSchema } from "@/design-system/frontdesk-schemas";
import {
  corruptSchemaOverrideMessage,
  isCorruptSchemaOverride,
} from "@/lib/schema-registry";
import { prisma } from "@/lib/prisma";
import { assertConfigAccess, type AdminOperator } from "@/server/admin/guards";
import type { ServerContext } from "@/server/context";
import { ServerActionError } from "@/server/errors";
import { loadValidSchemaOverrides } from "@/server/form-schema-overrides";
import { writePlatformAudit } from "@/server/platform-audit";
import { serializeForClient } from "@/server/serialize";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toJsonPayload(schema: FormSchema) {
  return serializeForClient(schema) as object;
}

async function auditBestEffort(input: Parameters<typeof writePlatformAudit>[0]) {
  try {
    await writePlatformAudit(input);
  } catch {
    /* publish must not fail when audit tables are unavailable */
  }
}

export async function saveFormSchemaOverride(
  ctx: ServerContext,
  operator: AdminOperator,
  schema: FormSchema,
  targetSchemaId?: string,
) {
  assertConfigAccess(operator);
  const schemaId = targetSchemaId ?? schema.id;
  const payload: FormSchema = { ...schema, id: schemaId };
  if (isCorruptSchemaOverride(schemaId, payload)) {
    throw new ServerActionError("VALIDATION", corruptSchemaOverrideMessage(schemaId));
  }
  const payloadJson = toJsonPayload(payload);
  await prisma.formSchemaOverride.upsert({
    where: { schemaId },
    update: { payload: payloadJson },
    create: { id: createId("schema"), schemaId, payload: payloadJson },
  });
  await auditBestEffort({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "forms",
    action: "schema_published",
    entityType: "form_schema",
    entityId: schemaId,
    summary: `Schema published: ${schemaId}`,
  });
}

export async function getFormSchemaOverride(ctx: ServerContext, schemaId: string) {
  const row = await prisma.formSchemaOverride.findUnique({ where: { schemaId } });
  return (row?.payload as FormSchema | null) ?? null;
}

export async function resetFormSchemaOverride(
  ctx: ServerContext,
  operator: AdminOperator,
  schemaId: string,
) {
  assertConfigAccess(operator);
  await prisma.formSchemaOverride.deleteMany({ where: { schemaId } });
  await auditBestEffort({
    ctx,
    actor: operator.name,
    actorRole: operator.staffRole,
    module: "forms",
    action: "schema_reset",
    entityType: "form_schema",
    entityId: schemaId,
    summary: `Schema reset: ${schemaId}`,
    severity: "warning",
  });
}

export async function listFormSchemaOverrides(ctx: ServerContext, purge = true) {
  const { overrides, purgedIds } = await loadValidSchemaOverrides(purge);

  if (purgedIds.length > 0) {
    await auditBestEffort({
      ctx,
      actor: "system",
      actorRole: "admin",
      module: "forms",
      action: "schema_purge_corrupt",
      entityType: "form_schema",
      entityId: purgedIds.join(","),
      summary: `Removed corrupt schema overrides (registration data on wrong keys): ${purgedIds.join(", ")}`,
      severity: "warning",
    });
  }

  return { overrides, purgedIds };
}
