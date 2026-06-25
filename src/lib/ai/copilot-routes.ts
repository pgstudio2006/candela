/** Canonical workspace routes Copilot may navigate to (prevents 404s from guessed paths). */
export const COPILOT_ROUTE_CATALOG = [
  { href: "/app/frontdesk/registration", label: "Patient registration" },
  { href: "/app/frontdesk/check-in", label: "Check-in" },
  { href: "/app/frontdesk/patients", label: "Patient list" },
  { href: "/app/frontdesk/appointments", label: "Appointments" },
  { href: "/app/frontdesk/billing", label: "Billing" },
  { href: "/app/frontdesk/queue", label: "Queue" },
  { href: "/app/frontdesk/junior-exam", label: "Junior exam" },
  { href: "/app/doctor/queue", label: "Doctor queue" },
  { href: "/app/crm/leads", label: "CRM leads" },
  { href: "/app/hr/staff", label: "HR staff" },
] as const;

const HREF_ALIASES: Record<string, string> = {
  "/app/frontdesk/register": "/app/frontdesk/registration",
  "/app/frontdesk/register-patient": "/app/frontdesk/registration",
  "/app/frontdesk/patient-registration": "/app/frontdesk/registration",
  "/app/frontdesk/new-patient": "/app/frontdesk/registration",
  "/app/frontdesk/patients/register": "/app/frontdesk/registration",
  "/app/frontdesk/patients/new": "/app/frontdesk/registration",
};

/** Map LLM-guessed paths to real Next.js routes. Returns empty string if invalid. */
export function normalizeCopilotHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/app/") || trimmed.includes("://")) return "";

  const noQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  const normalized = HREF_ALIASES[noQuery] ?? noQuery;

  const known = COPILOT_ROUTE_CATALOG.some(
    (r) => r.href === normalized || normalized.startsWith(`${r.href}/`),
  );
  if (!known && !normalized.match(/^\/app\/(frontdesk|doctor|nurse|crm|hr|counsellor|pharmacy|admin)(\/|$)/)) {
    return "";
  }

  return trimmed.replace(noQuery, normalized);
}

export function copilotRouteCatalogForPrompt(): string {
  return COPILOT_ROUTE_CATALOG.map((r) => `- ${r.label}: ${r.href}`).join("\n");
}
