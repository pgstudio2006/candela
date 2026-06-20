import { openRouterApiKey, openRouterAppUrl, openRouterModel } from "@/lib/ai/env";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
};

export type { ChatMessage };

type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function openRouterChat(input: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  jsonMode?: boolean;
  temperature?: number;
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": openRouterAppUrl(),
      "X-Title": "Candela Clinical OS",
    },
    body: JSON.stringify({
      model: openRouterModel(),
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.tools?.length ? "auto" : undefined,
      temperature: input.temperature ?? 0.2,
      response_format: input.jsonMode ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: ToolCall[];
      };
    }>;
  };

  const message = data.choices?.[0]?.message;
  return {
    content: message?.content?.trim() ?? "",
    toolCalls: message?.tool_calls ?? [],
  };
}
