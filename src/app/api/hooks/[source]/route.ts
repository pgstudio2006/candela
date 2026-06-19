import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/server/platform-audit";

type WebhookBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  externalId?: string;
};

/** Inbound CRM webhook — POST /api/hooks/crm?token=... */
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

  const stateRow = await prisma.crmWorkspaceState.findUnique({ where: { id: "default" } });
  const state = (stateRow?.payload ?? {}) as { leads?: Array<Record<string, unknown>> };
  const leads = state.leads ?? [];

  const phoneNorm = body.phone.replace(/\D/g, "").slice(-10);
  const duplicate = leads.find(
    (l) => String(l.phone ?? "").replace(/\D/g, "").slice(-10) === phoneNorm,
  );
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true, leadId: duplicate.id });
  }

  const leadId = `lead_${Date.now()}`;
  const newLead = {
    id: leadId,
    fullName: body.fullName.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim() ?? "",
    source: body.source ?? source,
    stage: "new",
    notes: body.notes ?? "",
    externalId: body.externalId ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await prisma.crmWorkspaceState.upsert({
    where: { id: "default" },
    create: { id: "default", payload: { leads: [newLead] } as object },
    update: { payload: { ...state, leads: [newLead, ...leads] } as object },
  });

  await prisma.crmWebhookConfig.updateMany({
    where: { id: { contains: source.toLowerCase() } },
    data: { lastEventAt: new Date().toISOString(), leadsToday: { increment: 1 } },
  });

  await writePlatformAudit({
    module: "crm",
    action: "webhook_lead_ingested",
    entityType: "lead",
    entityId: leadId,
    summary: `Webhook lead from ${source}: ${newLead.fullName}`,
    payload: newLead,
  });

  return NextResponse.json({ ok: true, leadId });
}
