import { openRouterChat, type ChatMessage } from "@/lib/ai/openrouter-client";
import type { CopilotAction, CopilotContext, CopilotMessage } from "@/lib/ai/scribe-types";

const COPILOT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "fill_consult_section",
      description: "Fill examination, diagnosis, or treatment fields on the active doctor consult.",
      parameters: {
        type: "object",
        properties: {
          visitId: { type: "string" },
          section: { type: "string", enum: ["examination", "diagnosis", "treatment"] },
          data: { type: "object", additionalProperties: true },
        },
        required: ["visitId", "section", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_prescription",
      description: "Set or replace prescription lines on the active consult.",
      parameters: {
        type: "object",
        properties: {
          visitId: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                drug: { type: "string" },
                dose: { type: "string" },
                frequency: { type: "string" },
                duration: { type: "string" },
                instructions: { type: "string" },
              },
              required: ["drug", "dose", "frequency", "duration"],
            },
          },
        },
        required: ["visitId", "lines"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "navigate",
      description: "Navigate the user to a workspace page to complete a task.",
      parameters: {
        type: "object",
        properties: {
          href: { type: "string" },
          label: { type: "string" },
        },
        required: ["href"],
      },
    },
  },
];

function contextBlock(ctx: CopilotContext): string {
  return JSON.stringify(ctx, null, 2);
}

function parseToolActions(name: string, argsRaw: string, ctx: CopilotContext): CopilotAction[] {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsRaw) as Record<string, unknown>;
  } catch {
    return [];
  }

  if (name === "fill_consult_section") {
    const visitId = String(args.visitId ?? ctx.visitId ?? "");
    const section = args.section as "examination" | "diagnosis" | "treatment";
    const data = args.data as Record<string, string | number | boolean>;
    if (!visitId || !section || !data) return [];
    return [{ type: "fill_section", visitId, section, data }];
  }

  if (name === "set_prescription") {
    const visitId = String(args.visitId ?? ctx.visitId ?? "");
    if (!visitId || !Array.isArray(args.lines)) return [];
    return [
      {
        type: "set_prescription",
        visitId,
        lines: args.lines as Array<{
          drug: string;
          dose: string;
          frequency: string;
          duration: string;
          instructions?: string;
        }>,
      },
    ];
  }

  if (name === "navigate") {
    const href = String(args.href ?? "");
    if (!href.startsWith("/app/")) return [];
    return [{ type: "navigate", href, label: args.label ? String(args.label) : undefined }];
  }

  return [];
}

export async function runCopilotAgent(input: {
  messages: CopilotMessage[];
  context: CopilotContext;
}): Promise<{ reply: string; actions: CopilotAction[] }> {
  const system = `You are Candela Copilot — an operational clinical agent inside a hospital SaaS.
You help staff complete real work: fill consult fields, draft prescriptions, and navigate to the right screen.
When the user asks you to do something you CAN do with tools, call the tool instead of only describing steps.
When on a doctor consult (visitId present), prefer fill_consult_section and set_prescription for documentation tasks.
Be concise, clinical, and action-oriented. Never fabricate patient data not in context.

Workspace context:
${contextBlock(input.context)}`;

  const chatMessages: ChatMessage[] = [
    { role: "system", content: system },
    ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const actions: CopilotAction[] = [];
  let reply = "";

  for (let step = 0; step < 4; step += 1) {
    const result = await openRouterChat({
      messages: chatMessages,
      tools: COPILOT_TOOLS,
      temperature: 0.3,
    });

    if (result.toolCalls.length === 0) {
      reply = result.content || "Done.";
      break;
    }

    chatMessages.push({
      role: "assistant",
      content: result.content || null,
      tool_calls: result.toolCalls,
    });

    for (const call of result.toolCalls) {
      actions.push(...parseToolActions(call.function.name, call.function.arguments, input.context));
      chatMessages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify({ ok: true }),
      });
    }

    if (step === 3) {
      reply = result.content || "Actions queued.";
    }
  }

  if (!reply) {
    reply =
      actions.length > 0
        ? `Completed ${actions.length} action${actions.length === 1 ? "" : "s"} for you.`
        : "How can I help with this workspace?";
  }

  return { reply, actions };
}
