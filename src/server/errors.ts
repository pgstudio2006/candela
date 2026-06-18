export type ServerErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_SESSION"
  | "INTERNAL_ERROR";

export class ServerActionError extends Error {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServerActionError";
  }
}

export function toServerError(error: unknown): ServerActionError {
  if (error instanceof ServerActionError) return error;
  if (error instanceof Error) return new ServerActionError("INTERNAL_ERROR", error.message);
  return new ServerActionError("INTERNAL_ERROR", "Unexpected server error");
}
