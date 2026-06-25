import type { FormSchema } from "@/design-system/frontdesk-schemas";

export const COUNSELLOR_INTAKE_SCHEMA: FormSchema = {
  id: "counsellor-intake",
  title: "Counselling intake",
  sections: [
    {
      id: "intake",
      label: "Session intake",
      fields: [
        { id: "chiefConcern", type: "textarea", label: "Patient chief concern", required: true, span: 2 },
        { id: "budgetRange", type: "select", label: "Budget comfort", options: [
          { value: "low", label: "Economy" },
          { value: "mid", label: "Mid-range" },
          { value: "premium", label: "Premium" },
        ]},
        { id: "decisionMaker", type: "text", label: "Decision maker present" },
        { id: "objectionNotes", type: "textarea", label: "Objections noted", span: 2 },
        { id: "internalNotes", type: "textarea", label: "Internal counsellor notes", span: 2 },
      ],
    },
  ],
};

export const COUNSELLOR_FOLLOWUP_SCHEMA: FormSchema = {
  id: "counsellor-followup",
  title: "Follow-up call",
  sections: [
    {
      id: "followup",
      label: "Follow-up",
      fields: [
        { id: "callbackOutcome", type: "select", label: "Outcome", required: true, options: [
          { value: "converted", label: "Converted" },
          { value: "thinking", label: "Still thinking" },
          { value: "declined", label: "Declined" },
          { value: "no_answer", label: "No answer" },
        ]},
        { id: "nextFollowUp", type: "datetime", label: "Next follow-up" },
        { id: "followupNotes", type: "textarea", label: "Notes", span: 2 },
      ],
    },
  ],
};

export const COUNSELLOR_PACKAGE_SCHEMA: FormSchema = {
  id: "counsellor-package",
  title: "Package presentation",
  sections: [
    {
      id: "package",
      label: "Package details",
      fields: [
        { id: "packageTier", type: "select", label: "Tier presented", options: [
          { value: "good", label: "Good" },
          { value: "better", label: "Better" },
          { value: "best", label: "Best" },
        ]},
        { id: "emiMonths", type: "number", label: "EMI months offered" },
        { id: "discountRequested", type: "discount-percent", label: "Discount requested (%)" },
        { id: "presentationNotes", type: "textarea", label: "Presentation notes", span: 2 },
      ],
    },
  ],
};
