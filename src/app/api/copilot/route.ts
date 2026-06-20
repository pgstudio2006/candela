import { runCopilotAgent } from "@/lib/ai/copilot-agent";
import type { CopilotContext, CopilotMessage } from "@/lib/ai/scribe-types";
import { requireApiAuth } from "@/server/ai/api-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as {
    messages?: CopilotMessage[];
    context?: CopilotContext;
  };

  const messages = body.messages?.filter((m) => m.content?.trim()) ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "Message required." }, { status: 400 });
  }

  const context: CopilotContext = {
    module: body.context?.module ?? auth.role,
    role: auth.role,
    page: body.context?.page ?? "",
    visitId: body.context?.visitId,
    patient: body.context?.patient,
    queueSummary: body.context?.queueSummary,
    consultSnapshot: body.context?.consultSnapshot,
  };

  try {
    const result = await runCopilotAgent({ messages, context });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Copilot request failed" },
      { status: 502 },
    );
  }
}
