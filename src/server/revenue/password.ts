import { compare, hash } from "bcryptjs";

const BCRYPT_PREFIX = "$2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password.trim(), 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const pwd = password.trim();
  if (!pwd || !passwordHash) return false;

  // Legacy SHA-256 hex (64 chars) — migrate on successful login
  if (!passwordHash.startsWith(BCRYPT_PREFIX) && passwordHash.length === 64) {
    const { createHash } = await import("node:crypto");
    const legacy = createHash("sha256").update(pwd).digest("hex");
    return legacy === passwordHash;
  }

  return compare(pwd, passwordHash);
}

export function isLegacyHash(passwordHash: string): boolean {
  return !passwordHash.startsWith(BCRYPT_PREFIX);
}
