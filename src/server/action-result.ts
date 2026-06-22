import { ServerActionError } from "@/server/errors";
import { throwIfPrismaError } from "@/server/prisma-errors";
import { serializeForClient } from "@/server/serialize";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; error: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(code: string, error: string): ActionResult<never> {
  return { ok: false, code, error };
}

/** Run server work and always return a serializable result (survives Next.js prod error masking). */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return actionOk(serializeForClient(data));
  } catch (error) {
    try {
      throwIfPrismaError(error);
    } catch (mapped) {
      if (mapped instanceof ServerActionError) {
        return actionFail(mapped.code, mapped.message);
      }
    }
    if (error instanceof ServerActionError) {
      return actionFail(error.code, error.message);
    }
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("Server Components render")) {
        return actionFail(
          "INTERNAL_ERROR",
          "Server failed while saving data. The production database likely needs `npx prisma db push`.",
        );
      }
      return actionFail("INTERNAL_ERROR", msg);
    }
    return actionFail("INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
