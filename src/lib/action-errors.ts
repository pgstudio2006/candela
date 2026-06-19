/** Parse server action errors on the client */
export type ParsedActionError = {
  code: string;
  message: string;
};

export function parseActionError(error: unknown): ParsedActionError {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; digest?: string };
    if (e.code && e.message) return { code: e.code, message: e.message };
    if (e.message) return { code: "UNKNOWN", message: e.message };
  }
  if (error instanceof Error) {
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
