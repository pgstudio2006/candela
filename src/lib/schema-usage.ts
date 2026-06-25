/** Where each published schema is rendered in Candela — shown in admin form builder. */
export const SCHEMA_USAGE: Record<string, { module: string; location: string }[]> = {
  registration: [
    { module: "Front desk", location: "Registration · patient edit" },
  ],
  checkin: [{ module: "Front desk", location: "Check-in" }],
  "junior-exam": [{ module: "Front desk", location: "Junior exam workspace" }],
  billing: [{ module: "Front desk", location: "Billing (metadata fields)" }],
  appointment: [{ module: "Front desk", location: "Appointments booking" }],
  "doctor-examination": [{ module: "Doctor", location: "Consultation workspace" }],
  "doctor-diagnosis": [{ module: "Doctor", location: "Consultation workspace" }],
  "doctor-treatment": [{ module: "Doctor", location: "Consultation workspace" }],
  "doctor-handoff": [{ module: "Doctor", location: "Consultation workspace" }],
  "doctor-ipd-round": [{ module: "Doctor", location: "IPD rounds" }],
  "nurse-vitals": [{ module: "Nurse", location: "Execution workspace" }],
  "nurse-consent-notes": [{ module: "Nurse", location: "Consent wizard (notes)" }],
  "nurse-session-notes": [{ module: "Nurse", location: "Execution workspace" }],
  "counsellor-intake": [{ module: "Counsellor", location: "Session workspace" }],
  "counsellor-followup": [{ module: "Counsellor", location: "Session follow-up" }],
  "counsellor-package": [{ module: "Counsellor", location: "Package selection" }],
  "pharmacy-dispense": [{ module: "Pharmacy", location: "Rx workspace" }],
  "pharmacy-intake": [{ module: "Pharmacy", location: "Intake form" }],
  "crm-lead-capture": [{ module: "CRM", location: "Add / edit lead modal" }],
  "crm-followup": [{ module: "CRM", location: "Follow-up scheduler" }],
  "hr-onboarding": [{ module: "HR", location: "Staff onboarding" }],
  "hr-leave-request": [{ module: "HR", location: "Leave request modal" }],
};

export function schemaUsageLabel(schemaId: string): string {
  const rows = SCHEMA_USAGE[schemaId];
  if (!rows?.length) return "Catalog only — not yet wired to a screen";
  return rows.map((r) => `${r.module}: ${r.location}`).join(" · ");
}
