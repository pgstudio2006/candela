import type { CandelaRole } from "@/design-system/modules";
import { getWorkspace } from "@/design-system/workspace-config";
import type { AuthDraft } from "@/lib/auth-types";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";

export type CompatSessionShape = {
  role: CandelaRole;
  branchId?: string;
  tenant?: string;
  tenantName?: string;
  branchName?: string;
  userEmail?: string;
};

export function sessionHasWorkspace(session: CompatSessionShape | null | undefined): boolean {
  return Boolean(session?.role && session.branchId);
}

export function resolvePostAuthPath(
  session: CompatSessionShape | null | undefined,
  draft: AuthDraft | null | undefined,
): string | null {
  if (sessionHasWorkspace(session) && session) {
    return getWorkspace(session.role).homePath;
  }
  if (draft?.branchId) return WORKSPACE_SIGN_IN_PATH;
  if (draft?.tenantId) return "/branch";
  return null;
}

export function resolveUnauthenticatedPath(hasDraftCookie = false): string {
  return hasDraftCookie ? WORKSPACE_SIGN_IN_PATH : "/login";
}
