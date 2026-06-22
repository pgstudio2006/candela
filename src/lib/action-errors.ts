/** Parse server action errors on the client */
export type ParsedActionError = {
  code: string;
  message: string;
};

const PROD_DIGEST_FALLBACK =
  "Server database error. Production schema may be out of date — run `npx prisma db push` on the server DATABASE_URL.";

export function parseActionError(error: unknown): ParsedActionError {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; digest?: string; ok?: boolean; error?: string };
    if (e.ok === false && e.error) {
      return { code: e.code ?? "UNKNOWN", message: e.error };
    }
    if (e.code && e.message) return { code: e.code, message: e.message };
    if (e.message) {
      if (e.message.includes("Server Components render")) {
        return { code: "INTERNAL_ERROR", message: PROD_DIGEST_FALLBACK };
      }
      return { code: "UNKNOWN", message: e.message };
    }
  }
  if (error instanceof Error) {
    if (error.message.includes("Server Components render")) {
      return { code: "INTERNAL_ERROR", message: PROD_DIGEST_FALLBACK };
    }
    const match = error.message.match(/^(DUPLICATE_PATIENT|FORBIDDEN|UNAUTHORIZED|CONFLICT):?\s*(.*)/i);
    if (match) return { code: match[1], message: match[2] || error.message };
    return { code: "UNKNOWN", message: error.message };
  }
  return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
}

export function isDuplicatePatientError(error: unknown) {
  const parsed = parseActionError(error);
  return parsed.code === "DUPLICATE_PATIENT" || parsed.code === "CONFLICT";
}
