import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAllTemplates, upsertTemplate, type WhatsAppTrigger } from "@/server/whatsapp/service";
import { serializeForClient } from "@/server/serialize";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx } = await resolveAdminOperator();
    const templates = await getAllTemplates(ctx);
    return NextResponse.json({ ok: true, data: serializeForClient(templates) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load templates.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx } = await resolveAdminOperator();
    const body = await request.json();
    const { trigger, label, body: templateBody, enabled } = body as {
      trigger: WhatsAppTrigger;
      label: string;
      body: string;
      enabled: boolean;
    };

    if (!trigger || !label || !templateBody) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const updated = await upsertTemplate(ctx, trigger, { label, body: templateBody, enabled });
    return NextResponse.json({ ok: true, data: serializeForClient(updated) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update template.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
