import type { FormDepartment } from "@/design-system/admin-data";
import {
  COUNSELLOR_FOLLOWUP_SCHEMA,
  COUNSELLOR_INTAKE_SCHEMA,
  COUNSELLOR_PACKAGE_SCHEMA,
} from "@/design-system/counsellor-schemas";
import {
  DOCTOR_DIAGNOSIS_SCHEMA,
  DOCTOR_EXAMINATION_SCHEMA,
  DOCTOR_HANDOFF_SCHEMA,
  DOCTOR_IPD_ROUND_SCHEMA,
  DOCTOR_TREATMENT_SCHEMA,
} from "@/design-system/doctor-schemas";
import { CRM_FOLLOWUP_SCHEMA, CRM_LEAD_CAPTURE_SCHEMA } from "@/design-system/crm-schemas";
import {
  APPOINTMENT_SCHEMA,
  BILLING_SCHEMA,
  CHECKIN_SCHEMA,
  JUNIOR_EXAM_SCHEMA,
  REGISTRATION_SCHEMA,
  type FormSchema,
  type SchemaField,
} from "@/design-system/frontdesk-schemas";
import { HR_LEAVE_REQUEST_SCHEMA, HR_ONBOARDING_SCHEMA } from "@/design-system/hr-schemas";
import {
  NURSE_CONSENT_NOTES_SCHEMA,
  NURSE_SESSION_NOTES_SCHEMA,
  NURSE_VITALS_SCHEMA,
} from "@/design-system/nurse-schemas";
import { PHARMACY_DISPENSE_SCHEMA, PHARMACY_INTAKE_SCHEMA } from "@/design-system/pharmacy-schemas";
import { otherDetailKey, parseMultiValue, selectionUsesOther } from "@/lib/schema-field-utils";

export const DOCTOR_FORM_SCHEMA_IDS = [
  "doctor-examination",
  "doctor-diagnosis",
  "doctor-treatment",
  "doctor-handoff",
  "doctor-ipd-round",
] as const;

export type DoctorFormSchemaId = (typeof DOCTOR_FORM_SCHEMA_IDS)[number];

export const FORM_SCHEMA_IDS = [
  "registration",
  "checkin",
  "billing",
  "appointment",
  "junior-exam",
] as const;

export type FormSchemaId = (typeof FORM_SCHEMA_IDS)[number];

export const NURSE_FORM_SCHEMA_IDS = [
  "nurse-vitals",
  "nurse-consent-notes",
  "nurse-session-notes",
] as const;

export type NurseFormSchemaId = (typeof NURSE_FORM_SCHEMA_IDS)[number];

export const COUNSELLOR_FORM_SCHEMA_IDS = [
  "counsellor-intake",
  "counsellor-followup",
  "counsellor-package",
] as const;

export type CounsellorFormSchemaId = (typeof COUNSELLOR_FORM_SCHEMA_IDS)[number];

export const PHARMACY_FORM_SCHEMA_IDS = ["pharmacy-dispense", "pharmacy-intake"] as const;

export type PharmacyFormSchemaId = (typeof PHARMACY_FORM_SCHEMA_IDS)[number];

export const CRM_FORM_SCHEMA_IDS = ["crm-lead-capture", "crm-followup"] as const;

export type CrmFormSchemaId = (typeof CRM_FORM_SCHEMA_IDS)[number];

export const HR_FORM_SCHEMA_IDS = ["hr-onboarding", "hr-leave-request"] as const;

export type HrFormSchemaId = (typeof HR_FORM_SCHEMA_IDS)[number];

export type AnyFormSchemaId =
  | FormSchemaId
  | DoctorFormSchemaId
  | NurseFormSchemaId
  | CounsellorFormSchemaId
  | PharmacyFormSchemaId
  | CrmFormSchemaId
  | HrFormSchemaId;

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

const NURSE_DEFAULT_SCHEMAS: Record<NurseFormSchemaId, FormSchema> = {
  "nurse-vitals": NURSE_VITALS_SCHEMA,
  "nurse-consent-notes": NURSE_CONSENT_NOTES_SCHEMA,
  "nurse-session-notes": NURSE_SESSION_NOTES_SCHEMA,
};

const COUNSELLOR_DEFAULT_SCHEMAS: Record<CounsellorFormSchemaId, FormSchema> = {
  "counsellor-intake": COUNSELLOR_INTAKE_SCHEMA,
  "counsellor-followup": COUNSELLOR_FOLLOWUP_SCHEMA,
  "counsellor-package": COUNSELLOR_PACKAGE_SCHEMA,
};

const PHARMACY_DEFAULT_SCHEMAS: Record<PharmacyFormSchemaId, FormSchema> = {
  "pharmacy-dispense": PHARMACY_DISPENSE_SCHEMA,
  "pharmacy-intake": PHARMACY_INTAKE_SCHEMA,
};

const CRM_DEFAULT_SCHEMAS: Record<CrmFormSchemaId, FormSchema> = {
  "crm-lead-capture": CRM_LEAD_CAPTURE_SCHEMA,
  "crm-followup": CRM_FOLLOWUP_SCHEMA,
};

const HR_DEFAULT_SCHEMAS: Record<HrFormSchemaId, FormSchema> = {
  "hr-onboarding": HR_ONBOARDING_SCHEMA,
  "hr-leave-request": HR_LEAVE_REQUEST_SCHEMA,
};

const ALL_DEFAULT_SCHEMAS: Record<string, FormSchema> = {
  ...DEFAULT_SCHEMAS,
  ...DOCTOR_DEFAULT_SCHEMAS,
  ...NURSE_DEFAULT_SCHEMAS,
  ...COUNSELLOR_DEFAULT_SCHEMAS,
  ...PHARMACY_DEFAULT_SCHEMAS,
  ...CRM_DEFAULT_SCHEMAS,
  ...HR_DEFAULT_SCHEMAS,
};

const SCHEMA_DEPARTMENT: Record<string, FormDepartment> = {
  registration: "frontdesk",
  checkin: "frontdesk",
  billing: "frontdesk",
  appointment: "frontdesk",
  "junior-exam": "frontdesk",
  "doctor-examination": "doctor",
  "doctor-diagnosis": "doctor",
  "doctor-treatment": "doctor",
  "doctor-handoff": "doctor",
  "doctor-ipd-round": "doctor",
  "nurse-vitals": "nurse",
  "nurse-consent-notes": "nurse",
  "nurse-session-notes": "nurse",
  "counsellor-intake": "counsellor",
  "counsellor-followup": "counsellor",
  "counsellor-package": "counsellor",
  "pharmacy-dispense": "pharmacy",
  "pharmacy-intake": "pharmacy",
  "crm-lead-capture": "crm",
  "crm-followup": "crm",
  "hr-onboarding": "hr",
  "hr-leave-request": "hr",
};

export type SchemaCatalogEntry = {
  id: string;
  label: string;
  department: FormDepartment;
};

export const SCHEMA_CATALOG: SchemaCatalogEntry[] = Object.entries(ALL_DEFAULT_SCHEMAS).map(
  ([id, schema]) => ({
    id,
    label: schema.title,
    department: SCHEMA_DEPARTMENT[id] ?? "admin",
  }),
);

export const SCHEMA_STORAGE_KEY = "candela-schema-overrides";
let schemaOverrides: Partial<Record<string, FormSchema>> = {};

export function getSchemaDepartment(schemaId: string): FormDepartment | null {
  return SCHEMA_DEPARTMENT[schemaId] ?? null;
}

export function listSchemasForDepartment(department: FormDepartment): SchemaCatalogEntry[] {
  return SCHEMA_CATALOG.filter((s) => s.department === department);
}

/** Render a subset of fields from a published schema (e.g. appointment notes only). */
export function subsetSchema(schema: FormSchema, fieldIds: string[]): FormSchema {
  const fields = schema.sections.flatMap((s) => s.fields).filter((f) => fieldIds.includes(f.id));
  return {
    id: schema.id,
    title: schema.title,
    sections: [{ id: "subset", label: "Details", fields }],
  };
}

export function getDefaultSchemaForId(id: string): FormSchema | null {
  const base = ALL_DEFAULT_SCHEMAS[id];
  return base ? structuredClone(base) : null;
}

export function getAnyFormSchema(id: string): FormSchema {
  const override = schemaOverrides[id];
  const fallback = ALL_DEFAULT_SCHEMAS[id];
  if (!fallback && !override) {
    throw new Error(`Unknown form schema: ${id}`);
  }
  const schema = structuredClone(override ?? fallback!);
  schema.id = id;
  return schema;
}

export function getDefaultDoctorSchema(id: DoctorFormSchemaId): FormSchema {
  return structuredClone(DOCTOR_DEFAULT_SCHEMAS[id]);
}

export function getDoctorFormSchema(id: DoctorFormSchemaId): FormSchema {
  return getAnyFormSchema(id);
}

export function listAllFormSchemas(): FormSchema[] {
  return SCHEMA_CATALOG.map((entry) => getAnyFormSchema(entry.id));
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
  return getAnyFormSchema(id);
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
      const value = values[field.id];

      if (field.type === "toggle") {
        if (field.required && value !== true) errors[field.id] = `${field.label} is required`;
        continue;
      }

      if (field.type === "multiselect" || (field.type === "checkbox" && field.options?.length)) {
        if (field.required && parseMultiValue(value).length === 0) {
          errors[field.id] = `${field.label} is required`;
        }
      } else if (field.type === "checkbox") {
        if (field.required && value !== true) errors[field.id] = `${field.label} is required`;
      } else if (field.required) {
        const empty = value === undefined || value === null || value === "";
        if (empty) errors[field.id] = `${field.label} is required`;
      }

      if (selectionUsesOther(field, value)) {
        const detail = values[otherDetailKey(field.id)];
        const detailEmpty = detail === undefined || detail === null || String(detail).trim() === "";
        if (detailEmpty) errors[otherDetailKey(field.id)] = "Please enter details for Other";
      }
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
