import type { AuthDraft } from "@/lib/auth-types";

export const DRAFT_COOKIE_NAME = "candela-auth-draft";
export const DRAFT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function serializeAuthDraft(draft: AuthDraft): string {
  return encodeURIComponent(JSON.stringify(draft));
}

export function parseAuthDraftCookie(value: string | undefined | null): AuthDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as AuthDraft;
    if (!parsed?.tenantId?.trim() || !parsed?.tenantName?.trim()) return null;
    return {
      tenantId: parsed.tenantId.trim(),
      tenantName: parsed.tenantName.trim(),
      branchId: parsed.branchId?.trim() || undefined,
      branchName: parsed.branchName?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function draftFromJwtUser(user: {
  tenantSlug?: string;
  tenantName?: string;
  branchId?: string;
  branchName?: string;
}): AuthDraft | null {
  if (!user.tenantSlug?.trim() || !user.tenantName?.trim()) return null;
  return {
    tenantId: user.tenantSlug.trim(),
    tenantName: user.tenantName.trim(),
    branchId: user.branchId?.trim() || undefined,
    branchName: user.branchName?.trim() || undefined,
  };
}

export function mergeAuthDraft(
  ...candidates: (AuthDraft | null | undefined)[]
): AuthDraft | null {
  let result: AuthDraft | null = null;
  for (const candidate of candidates) {
    if (!candidate?.tenantId) continue;
    if (!result) {
      result = {
        tenantId: candidate.tenantId,
        tenantName: candidate.tenantName,
        branchId: candidate.branchId,
        branchName: candidate.branchName,
      };
      continue;
    }
    result = {
      tenantId: candidate.tenantId,
      tenantName: candidate.tenantName,
      branchId: candidate.branchId ?? result.branchId,
      branchName: candidate.branchName ?? result.branchName,
    };
  }
  return result;
}

export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
