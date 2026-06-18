import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __candelaPrisma__: PrismaClient | undefined;
}

export const db =
  global.__candelaPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__candelaPrisma__ = db;
}
