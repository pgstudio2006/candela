import type { FormSchema } from "@/design-system/frontdesk-schemas";

export const HR_ONBOARDING_SCHEMA: FormSchema = {
  id: "hr-onboarding",
  title: "Staff onboarding",
  sections: [
    {
      id: "personal",
      label: "Personal details",
      fields: [
        { id: "fullName", type: "text", label: "Full name", required: true },
        { id: "email", type: "email", label: "Work email", required: true },
        { id: "phone", type: "phone", label: "Phone", required: true },
        { id: "dateOfJoining", type: "date", label: "Date of joining", required: true },
        { id: "designation", type: "text", label: "Designation", required: true },
        { id: "department", type: "text", label: "Department" },
      ],
    },
    {
      id: "compliance",
      label: "Compliance",
      fields: [
        { id: "idProof", type: "file", label: "ID proof upload" },
        { id: "medicalFitness", type: "toggle", label: "Medical fitness certificate on file" },
        { id: "policyAck", type: "toggle", label: "HR policies acknowledged", required: true },
        { id: "onboardingNotes", type: "textarea", label: "Onboarding notes", span: 2 },
      ],
    },
  ],
};

export const HR_LEAVE_REQUEST_SCHEMA: FormSchema = {
  id: "hr-leave-request",
  title: "Leave request",
  sections: [
    {
      id: "leave",
      label: "Leave details",
      fields: [
        { id: "leaveType", type: "select", label: "Leave type", required: true, options: [
          { value: "casual", label: "Casual" },
          { value: "sick", label: "Sick" },
          { value: "earned", label: "Earned" },
          { value: "unpaid", label: "Unpaid" },
        ]},
        { id: "fromDate", type: "date", label: "From date", required: true },
        { id: "toDate", type: "date", label: "To date", required: true },
        { id: "reason", type: "textarea", label: "Reason", span: 2 },
      ],
    },
  ],
};
