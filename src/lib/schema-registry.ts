import {
  DOCTOR_DIAGNOSIS_SCHEMA,
  DOCTOR_EXAMINATION_SCHEMA,
  DOCTOR_HANDOFF_SCHEMA,
  DOCTOR_IPD_ROUND_SCHEMA,
  DOCTOR_TREATMENT_SCHEMA,
} from "@/design-system/doctor-schemas";
import {
  APPOINTMENT_SCHEMA,
  BILLING_SCHEMA,
  CHECKIN_SCHEMA,
  JUNIOR_EXAM_SCHEMA,
  REGISTRATION_SCHEMA,
  type FormSchema,
  type SchemaField,
} from "@/design-system/frontdesk-schemas";

export const DOCTOR_FORM_SCHEMA_IDS = [
  "doctor-examination",
  "doctor-diagnosis",
  "doctor-treatment",
  "doctor-handoff",
  "doctor-ipd-round",
] as const;

export type DoctorFormSchemaId = (typeof DOCTOR_FORM_SCHEMA_IDS)[number];

export type AnyFormSchemaId = FormSchemaId | DoctorFormSchemaId;

export const FORM_SCHEMA_IDS = [
  "registration",
  "checkin",
  "billing",
  "appointment",
  "junior-exam",
] as const;

export type FormSchemaId = (typeof FORM_SCHEMA_IDS)[number];

const DEFAULT_SCHEMAS: Record<FormSchemaId, FormSchema> = {
  registration: REGISTRATION_SCHEMA,
  checkin: CHECKIN_SCHEMA,
  billing: BILLING_SCHEMA,
  appointment: APPOINTMENT_SCHEMA,
  "junior-exam": JUNIOR_EXAM_SCHEMA,
};

const DOCTOR_DEFAULT_SCHEMAS: Record<DoctorFormSchemaId, FormSchema> = {
  "doctor-examination": DOCTOR_EXAMINATION_SCHEMA,
  "doctor-diagnosis": DOCTOR_DIAGNOSIS_SCHEMA,
  "doctor-treatment": DOCTOR_TREATMENT_SCHEMA,
  "doctor-handoff": DOCTOR_HANDOFF_SCHEMA,
  "doctor-ipd-round": DOCTOR_IPD_ROUND_SCHEMA,
};

export const SCHEMA_STORAGE_KEY = "candela-schema-overrides";
let schemaOverrides: Partial<Record<string, FormSchema>> = {};

export function getDefaultDoctorSchema(id: DoctorFormSchemaId): FormSchema {
  return structuredClone(DOCTOR_DEFAULT_SCHEMAS[id]);
}

export function getDoctorFormSchema(id: DoctorFormSchemaId): FormSchema {
  return structuredClone(schemaOverrides[id] ?? getDefaultDoctorSchema(id));
}

export function listAllFormSchemas(): FormSchema[] {
  return [
    ...FORM_SCHEMA_IDS.map((id) => getFormSchema(id)),
    ...DOCTOR_FORM_SCHEMA_IDS.map((id) => getDoctorFormSchema(id)),
  ];
}

export function saveAnyFormSchema(schema: FormSchema) {
  schemaOverrides[schema.id] = structuredClone(schema);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-schema-updated", { detail: { id: schema.id } }));
  }
}

export function resetAnyFormSchema(id: string) {
  delete schemaOverrides[id];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-schema-updated", { detail: { id } }));
  }
}


export function getDefaultSchema(id: FormSchemaId): FormSchema {
  return structuredClone(DEFAULT_SCHEMAS[id]);
}

export function listFormSchemas(): FormSchema[] {
  return FORM_SCHEMA_IDS.map((id) => getFormSchema(id));
}

export function getFormSchema(id: FormSchemaId): FormSchema {
  const override = schemaOverrides[id];
  if (id === "registration" && override) {
    const hasFullName = override.sections.some((section) =>
      section.fields.some((field) => field.id === "fullName"),
    );
    if (!hasFullName) return getDefaultSchema(id);
  }
  return structuredClone(override ?? getDefaultSchema(id));
}

export function saveFormSchema(schema: FormSchema) {
  saveAnyFormSchema(schema);
}

export function resetFormSchema(id: FormSchemaId) {
  resetAnyFormSchema(id);
}

export function resetAllFormSchemas() {
  schemaOverrides = {};
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-schema-updated"));
  }
}

export function setSchemaOverrideCache(overrides: Partial<Record<string, FormSchema>>) {
  schemaOverrides = { ...overrides };
}

export function validateFormValues(
  schema: FormSchema,
  values: Record<string, string | number | boolean>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "section" || field.type === "divider" || field.type === "help" || field.type === "formula" || field.readOnly) continue;
      if (!field.required) continue;
      const value = values[field.id];
      if (field.type === "toggle") {
        if (field.required && value !== true) errors[field.id] = `${field.label} is required`;
        continue;
      }
      const empty = value === undefined || value === null || value === "";
      if (empty) errors[field.id] = `${field.label} is required`;
    }
  }
  return errors;
}

export function newFieldId(label: string, existing: SchemaField[]): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24) || "field";
  let id = base;
  let n = 1;
  while (existing.some((f) => f.id === id)) {
    id = `${base}_${n++}`;
  }
  return id;
}
