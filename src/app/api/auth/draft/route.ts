import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { AuthDraft } from "@/lib/auth-types";
import {
  DRAFT_COOKIE_MAX_AGE,
  DRAFT_COOKIE_NAME,
  isSecureRequest,
  parseAuthDraftCookie,
  serializeAuthDraft,
} from "@/lib/auth/draft-cookie";

function draftResponse(draft: AuthDraft | null) {
  return NextResponse.json({ draft });
}

export async function GET() {
  const cookieStore = await cookies();
  const draft = parseAuthDraftCookie(cookieStore.get(DRAFT_COOKIE_NAME)?.value);
  return draftResponse(draft);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as AuthDraft;
  const draft: AuthDraft = {
    tenantId: raw.tenantId?.trim() ?? "",
    tenantName: raw.tenantName?.trim() ?? "",
    branchId: raw.branchId?.trim() || undefined,
    branchName: raw.branchName?.trim() || undefined,
  };

  if (!draft.tenantId || !draft.tenantName) {
    return NextResponse.json({ error: "tenantId and tenantName are required" }, { status: 400 });
  }

  const response = draftResponse(draft);
  response.cookies.set({
    name: DRAFT_COOKIE_NAME,
    value: serializeAuthDraft(draft),
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_COOKIE_MAX_AGE,
  });
  return response;
}

export async function DELETE(request: Request) {
  const response = draftResponse(null);
  response.cookies.set({
    name: DRAFT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
