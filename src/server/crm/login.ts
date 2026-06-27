import { prisma } from "@/lib/prisma";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { verifyPassword } from "@/server/revenue/password";

export type CrmLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export async function validateCrmLogin(email: string, password: string): Promise<CrmLoginResult> {
  await ensureRevenueSeeded();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter your work email and password." };

  const operator = await prisma.crmOperatorCredential.findUnique({
    where: { email: normalized },
  });
  if (!operator) {
    return {
      ok: false,
      error: "No CRM account found for this email. Ask your manager to add you under Team & routing.",
    };
  }
  if (!operator.active) return { ok: false, error: "This account is inactive. Contact your CRM manager." };
  if (!(await verifyPassword(pwd, operator.passwordHash))) return { ok: false, error: "Incorrect password." };
  return { ok: true, operatorId: operator.id, name: operator.name, email: operator.email };
}
