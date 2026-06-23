import { listDatabaseBackups, runDatabaseBackup } from "@/server/db-backup";
import { verifyCronSecret } from "@/server/scheduled-jobs";
import { NextResponse } from "next/server";

function isAuthorized(request: Request) {
  const bootstrapHeader = request.headers.get("x-bootstrap-secret");
  const bootstrapEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  return (
    verifyCronSecret(request) ||
    (Boolean(bootstrapEnv) && bootstrapHeader === bootstrapEnv)
  );
}

/** Ops: pg_dump backup to BACKUP_DIR (CRON_SECRET or ADMIN_BOOTSTRAP_PASSWORD). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const backups = await listDatabaseBackups();
  return NextResponse.json({
    ok: true,
    backupDir: process.env.BACKUP_DIR?.trim() || "/data/backups",
    retentionDays: Number(process.env.BACKUP_RETENTION_DAYS ?? 14),
    backups,
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDatabaseBackup();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database backup failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
