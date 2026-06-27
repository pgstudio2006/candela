import { prisma } from "@/lib/prisma";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { verifyPassword } from "@/server/revenue/password";

export type PharmacyLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export async function validatePharmacyLogin(email: string, password: string): Promise<PharmacyLoginResult> {
  await ensureRevenueSeeded();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  const operator = await prisma.pharmacyOperatorCredential.findUnique({
    where: { email: normalized },
  });
  if (!operator) return { ok: false, error: "No pharmacy account for this email." };
  if (!operator.active) return { ok: false, error: "Account inactive." };
  if (!(await verifyPassword(pwd, operator.passwordHash))) {
    return { ok: false, error: "Incorrect password." };
  }
  return { ok: true, operatorId: operator.id, name: operator.name, email: operator.email };
}
