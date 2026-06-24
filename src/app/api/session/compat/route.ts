import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import type { AuthDraft } from "@/lib/auth-types";
import {
  DRAFT_COOKIE_NAME,
  draftFromJwtUser,
  mergeAuthDraft,
  parseAuthDraftCookie,
} from "@/lib/auth/draft-cookie";
import { enrichCompatSession } from "@/server/session-enrichment";

export async function GET() {
  const cookieStore = await cookies();
  const cookieDraft = parseAuthDraftCookie(cookieStore.get(DRAFT_COOKIE_NAME)?.value);

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ session: null, authDraft: cookieDraft });
  }

  const compat = await enrichCompatSession({
    tenant: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    branchId: session.user.branchId,
    branchName: session.user.branchName,
    role: session.user.role,
    userName: session.user.name ?? "",
    userEmail: session.user.email ?? "",
  });

  const jwtDraft = draftFromJwtUser({
    tenantSlug: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    branchId: session.user.branchId,
    branchName: session.user.branchName,
  });

  const authDraft: AuthDraft | null = mergeAuthDraft(cookieDraft, jwtDraft);

  return NextResponse.json({ session: compat, authDraft });
}
