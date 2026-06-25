import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { CRM_APPOINTMENT_CENTRES, CRM_INDIAN_STATES } from "@/design-system/crm-data";

export const CRM_LEAD_CAPTURE_SCHEMA: FormSchema = {
  id: "crm-lead-capture",
  title: "Lead capture",
  sections: [
    {
      id: "patient",
      label: "Patient details",
      fields: [
        { id: "fullName", type: "text", label: "Full name", required: true },
        { id: "phone", type: "phone", label: "Phone", required: true },
        { id: "alternatePhone", type: "phone", label: "Alternate number" },
        { id: "email", type: "email", label: "Email" },
        { id: "age", type: "number", label: "Age" },
        {
          id: "gender",
          type: "select",
          label: "Gender",
          options: [
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
            { value: "prefer_not", label: "Prefer not to say" },
          ],
        },
      ],
    },
    {
      id: "location",
      label: "Location",
      fields: [
        { id: "city", type: "text", label: "City" },
        { id: "district", type: "text", label: "District" },
        {
          id: "state",
          type: "select",
          label: "State",
          options: CRM_INDIAN_STATES.map((s) => ({ value: s, label: s })),
        },
        { id: "country", type: "text", label: "Country", defaultValue: "India" },
      ],
    },
    {
      id: "clinical",
      label: "Clinical & appointment",
      fields: [
        { id: "doctorName", type: "text", label: "Doctor name" },
        { id: "specialty", type: "text", label: "Specialty", placeholder: "spine, knee…" },
        { id: "valueEstimate", type: "currency", label: "Est. value (₹)", defaultValue: 50000 },
        { id: "appointmentDate", type: "date", label: "Appointment date" },
        { id: "appointmentTime", type: "time", label: "Appointment time" },
        {
          id: "appointmentCentre",
          type: "select",
          label: "Appointment centre",
          options: CRM_APPOINTMENT_CENTRES.map((c) => ({ value: c, label: c })),
        },
        {
          id: "source",
          type: "select",
          label: "Lead source",
          required: true,
          options: [
            { value: "website", label: "Website" },
            { value: "google", label: "Google" },
            { value: "referral", label: "Referral" },
            { value: "walkin", label: "Walk-in" },
            { value: "campaign", label: "Campaign" },
            { value: "phone", label: "Phone" },
            { value: "whatsapp", label: "WhatsApp" },
          ],
        },
        { id: "notes", type: "textarea", label: "Notes", span: 2 },
      ],
    },
  ],
};

export const CRM_FOLLOWUP_SCHEMA: FormSchema = {
  id: "crm-followup",
  title: "Lead follow-up",
  sections: [
    {
      id: "followup",
      label: "Follow-up log",
      fields: [
        {
          id: "outcome",
          type: "select",
          label: "Outcome",
          required: true,
          options: [
            { value: "connected", label: "Connected" },
            { value: "callback", label: "Callback scheduled" },
            { value: "not_interested", label: "Not interested" },
            { value: "converted", label: "Converted" },
          ],
        },
        { id: "nextAction", type: "datetime", label: "Next action" },
        { id: "followupNotes", type: "textarea", label: "Notes", span: 2 },
      ],
    },
  ],
};
