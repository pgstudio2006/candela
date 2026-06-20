function cleanEnv(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export function deepgramApiKey(): string {
  const key = cleanEnv(process.env.DEEPGRAM_API_KEY);
  if (!key) throw new Error("DEEPGRAM_API_KEY is not configured.");
  return key;
}

export function openRouterApiKey(): string {
  const key = cleanEnv(process.env.OPENROUTER_API_KEY);
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured.");
  return key;
}

export function openRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4-flash";
}

export function openRouterAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://os.candela.adrine.in";
}
