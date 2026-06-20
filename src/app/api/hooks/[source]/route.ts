import { NextResponse } from "next/server";
import {
  ingestInboundLeadWebhook,
  mapWebhookSourceToIntegration,
  resolveWebhookContext,
} from "@/server/crm/index";

type WebhookBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  externalId?: string;
  specialty?: string;
};

/** Inbound CRM webhook — POST /api/hooks/crm?token=...&tenantId=...&branchId=... */
export async function POST(
  request: Request,
  context: { params: Promise<{ source: string }> },
) {
  const { source } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-candela-token") ?? "";
  const expected = process.env.CRM_WEBHOOK_TOKEN ?? "candela-crm-demo";

  if (token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.fullName?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "fullName and phone required" }, { status: 400 });
  }

  const ctx = resolveWebhookContext(url);
  const integrationId = mapWebhookSourceToIntegration(body.source ?? source);

  try {
    const result = await ingestInboundLeadWebhook(
      ctx,
      integrationId,
      {
        name: body.fullName.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim(),
        specialty: body.specialty,
        notes: body.notes ?? (body.externalId ? `External ID: ${body.externalId}` : undefined),
      },
      source,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      leadId: result.leadId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
