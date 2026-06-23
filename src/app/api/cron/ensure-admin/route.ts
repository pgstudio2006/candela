import { ensureAdminAccount } from "@/server/admin/bootstrap-admin";
import { verifyCronSecret } from "@/server/scheduled-jobs";
import { NextResponse } from "next/server";

/** Ops: reset/create admin login (CRON_SECRET or ADMIN_BOOTSTRAP_PASSWORD header). */
export async function POST(request: Request) {
  const bootstrapHeader = request.headers.get("x-bootstrap-secret");
  const bootstrapEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const authorized =
    verifyCronSecret(request) ||
    (Boolean(bootstrapEnv) && bootstrapHeader === bootstrapEnv);

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ensureAdminAccount();
    return NextResponse.json({
      ok: true,
      email: result.email,
      created: result.created,
      passwordUpdated: result.passwordUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ensure admin account.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
