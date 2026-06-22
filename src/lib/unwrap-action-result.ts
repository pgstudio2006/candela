import type { ActionResult } from "@/server/action-result";

export function unwrapActionResult<T>(
  result: ActionResult<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  if (result.ok) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
}
