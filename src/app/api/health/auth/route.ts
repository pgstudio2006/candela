import { resolveAppUrl } from "@/lib/auth/app-url";
import { NextResponse } from "next/server";

/** Ops diagnostic — verify Auth.js URL config on production. */
export async function GET() {
  const authUrl = process.env.AUTH_URL ?? "";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const resolved = resolveAppUrl() ?? "";
  const misconfigured =
    authUrl.includes("localhost") ||
    authUrl.includes("127.0.0.1") ||
    (Boolean(publicUrl) && Boolean(authUrl) && authUrl !== publicUrl.replace(/\/$/, ""));

  return NextResponse.json({
    ok: !misconfigured,
    authUrl,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? "",
    publicUrl,
    resolved,
    misconfigured,
    hint: misconfigured
      ? "Set AUTH_URL and NEXT_PUBLIC_APP_URL to https://os.candela.adrine.in and redeploy."
      : undefined,
  });
}
