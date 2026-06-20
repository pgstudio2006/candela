/** Demo seed runs only in non-production unless explicitly enabled. */
export function isDemoSeedEnabled(): boolean {
  if (process.env.ALLOW_DEMO_SEED === "true") return true;
  return process.env.NODE_ENV !== "production";
}
