/**
 * Reset admin login password on the server:
 *   ADMIN_EMAIL=admin@navayu.in ADMIN_PASSWORD='YourNewPassword' node scripts/reset-admin-password.mjs
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL ?? "admin@navayu.in").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "Candela@Admin2026";

async function main() {
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`No User row for ${email}. Run: npm run db:seed-admin`);
    process.exit(1);
  }
  const passwordHash = await hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, status: "ACTIVE" },
  });
  console.log(`Password updated for ${email}`);
  console.log(`Use password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
