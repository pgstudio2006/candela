/** Canonical public URL for Auth.js — must match the browser origin in production. */
export function resolveAppUrl(): string | undefined {
  const candidates = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    if (value.includes("localhost") || value.includes("127.0.0.1")) continue;
    return value.replace(/\/$/, "");
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return fallback ? fallback.replace(/\/$/, "") : undefined;
}

/** Override localhost AUTH_URL when a real public URL is configured (fixes production sign-in). */
export function ensureAuthUrl(): string | undefined {
  const resolved = resolveAppUrl();
  if (!resolved) return undefined;

  const current = process.env.AUTH_URL?.trim() ?? "";
  const needsFix =
    !current || current.includes("localhost") || current.includes("127.0.0.1");

  if (needsFix) {
    process.env.AUTH_URL = resolved;
    process.env.NEXTAUTH_URL = resolved;
  }

  return process.env.AUTH_URL;
}
