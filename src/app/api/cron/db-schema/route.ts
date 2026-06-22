import { execSync } from "node:child_process";
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/server/scheduled-jobs";

/** Cron: apply Prisma schema to production DATABASE_URL (inside container network). */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not set" }, { status: 500 });
  }

  try {
    const output = execSync("npx prisma db push --skip-generate --accept-data-loss", {
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return NextResponse.json({ ok: true, output: output.slice(-4000) });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        ok: false,
        error: e.message ?? "db push failed",
        stdout: e.stdout?.slice(-2000),
        stderr: e.stderr?.slice(-2000),
      },
      { status: 500 },
    );
  }
}
