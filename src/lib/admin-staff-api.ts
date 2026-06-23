import type { StaffMember } from "@/design-system/admin-data";
import type { AdminSnapshot } from "@/server/admin/actions";

export async function fetchAdminSnapshot(): Promise<
  { ok: true; data: AdminSnapshot } | { ok: false; error: string }
> {
  const res = await fetch("/api/admin/snapshot", { cache: "no-store", credentials: "include" });
  const json = (await res.json()) as { ok: boolean; data?: AdminSnapshot; error?: string };
  if (res.ok && json.ok && json.data) return { ok: true, data: json.data };
  return { ok: false, error: json.error ?? "Failed to load admin workspace." };
}

export async function createStaffWithLoginApi(input: {
  staff: Omit<StaffMember, "id">;
  moduleRole?: string;
  password?: string;
}): Promise<
  | {
      ok: true;
      data: {
        staffId: string;
        doctorId?: string;
        loginEmail: string;
        initialPassword?: string;
        snapshot: AdminSnapshot;
      };
    }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/admin/staff/with-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as {
    ok: boolean;
    data?: {
      staffId: string;
      doctorId?: string;
      loginEmail: string;
      initialPassword?: string;
      snapshot: AdminSnapshot;
    };
    error?: string;
  };
  if (res.ok && json.ok && json.data) return { ok: true, data: json.data };
  return { ok: false, error: json.error ?? "Failed to add staff with login." };
}

export async function resetStaffPasswordApi(
  staffId: string,
  password?: string,
): Promise<
  | { ok: true; data: { loginEmail: string; initialPassword: string; snapshot: AdminSnapshot } }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const json = (await res.json()) as {
    ok: boolean;
    data?: { loginEmail: string; initialPassword: string; snapshot: AdminSnapshot };
    error?: string;
  };
  if (res.ok && json.ok && json.data) return { ok: true, data: json.data };
  return { ok: false, error: json.error ?? "Failed to reset password." };
}
