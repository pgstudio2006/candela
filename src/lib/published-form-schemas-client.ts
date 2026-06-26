import type { FormSchema } from "@/design-system/frontdesk-schemas";

export type PublishedFormSchemasResult =
  | { ok: true; data: Partial<Record<string, FormSchema>> }
  | { ok: false; error: string };

/** Load published schemas via API — avoids production server-action failures. */
export async function fetchPublishedFormSchemas(
  opts?: { purge?: boolean },
): Promise<PublishedFormSchemasResult> {
  const purge = opts?.purge ?? true;
  const query = purge ? "" : "?purge=0";
  try {
    const res = await fetch(`/api/admin/form-schemas${query}`, {
      cache: "no-store",
      credentials: "include",
    });
    const json = (await res.json()) as
      | { ok: true; data: { overrides: Partial<Record<string, FormSchema>> } }
      | { ok: false; error: string };
    if (res.ok && json.ok) {
      return { ok: true, data: json.data.overrides };
    }
    return {
      ok: false,
      error: (!json.ok && json.error) || "Failed to load published form schemas.",
    };
  } catch {
    return { ok: false, error: "Failed to load published form schemas." };
  }
}
