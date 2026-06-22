/** Demo seed runs only when explicitly enabled — never auto-seeds in production or on deploy. */
export function isDemoSeedEnabled(): boolean {
  return process.env.ALLOW_DEMO_SEED === "true" || process.env.RUN_DB_SEED === "true";
}
