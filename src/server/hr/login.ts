import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/server/bootstrap";
import { hashPassword, verifyPassword, isLegacyHash } from "@/server/revenue/password";

export type HrLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export async function validateHrLogin(email: string, password: string): Promise<HrLoginResult> {
  await ensureBootstrapData();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  const employee = await prisma.hrEmployee.findFirst({
    where: { email: normalized, active: true },
  });
  if (!employee) return { ok: false, error: "No HR account for this email." };

  const cred = await prisma.hrCredential.findUnique({ where: { employeeId: employee.id } });
  if (!cred) return { ok: false, error: "No workspace login for this employee. Ask HR to provision credentials." };

  const valid = await verifyPassword(pwd, cred.password);
  if (!valid) return { ok: false, error: "Incorrect password." };

  if (isLegacyHash(cred.password)) {
    await prisma.hrCredential.update({
      where: { employeeId: employee.id },
      data: { password: await hashPassword(pwd) },
    });
  }

  return { ok: true, operatorId: employee.id, name: employee.name, email: employee.email };
}
