import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/** Ops diagnostic — admin user presence (no secrets). */
export async function GET() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@navayu.in").trim().toLowerCase();
  const user = await db.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      branchId: true,
      activeRole: { select: { key: true } },
      tenant: { select: { slug: true, active: true } },
    },
  });
  const branch = user?.branchId
    ? await db.branch.findFirst({ where: { id: user.branchId, active: true } })
    : null;

  return NextResponse.json({
    ok: Boolean(user && user.status === "ACTIVE" && user.tenant?.active),
    email,
    userFound: Boolean(user),
    userStatus: user?.status ?? null,
    role: user?.activeRole?.key ?? null,
    tenant: user?.tenant?.slug ?? null,
    tenantActive: user?.tenant?.active ?? null,
    branchId: user?.branchId ?? null,
    branchActive: Boolean(branch),
  });
}
