import { parseActionError } from "@/lib/action-errors";

export function isTransientSessionError(error: unknown): boolean {
  const { code, message } = parseActionError(error);
  if (code === "INVALID_SESSION" || code === "UNAUTHORIZED") return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("session") ||
    lower.includes("sign in") ||
    lower.includes("tenant or branch")
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
