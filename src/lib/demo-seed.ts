/** Runtime demo seed — never tied to deploy-time `RUN_DB_SEED` (that only runs prisma/seed.ts). */
export function isDemoSeedEnabled(): boolean {
  return process.env.ALLOW_DEMO_SEED === "true";
}
