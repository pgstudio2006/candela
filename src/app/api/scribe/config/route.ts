import { deepgramApiKey } from "@/lib/ai/env";
import { deepgramLanguageFor } from "@/lib/ai/deepgram-languages";
import { requireApiAuth } from "@/server/ai/api-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = await requireApiAuth(["doctor"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") ?? "en";

  try {
    return NextResponse.json({
      apiKey: deepgramApiKey(),
      model: process.env.DEEPGRAM_MODEL?.trim() || "nova-2",
      deepgramLanguage: deepgramLanguageFor(language),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deepgram not configured" },
      { status: 503 },
    );
  }
}
