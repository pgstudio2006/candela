import type { FieldType, SchemaField } from "@/design-system/frontdesk-schemas";

export const OTHER_OPTION_VALUE = "__other__";

export const CHOICE_FIELD_TYPES: FieldType[] = ["select", "multiselect", "radio", "checkbox"];

export function isChoiceField(type: FieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(type);
}

export function otherDetailKey(fieldId: string): string {
  return `${fieldId}__other_detail`;
}

export function fieldOptionsForRender(field: SchemaField): { value: string; label: string }[] {
  const base = [...(field.options ?? [])];
  if (field.allowOther && !base.some((o) => o.value === OTHER_OPTION_VALUE)) {
    base.push({ value: OTHER_OPTION_VALUE, label: "Other" });
  }
  return base;
}

export function parseMultiValue(value: string | number | boolean | undefined): string[] {
  if (value === undefined || value === null || value === "") return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toggleMultiValue(current: string | number | boolean | undefined, optionValue: string): string {
  const set = new Set(parseMultiValue(current));
  if (set.has(optionValue)) set.delete(optionValue);
  else set.add(optionValue);
  return [...set].join(",");
}

export function selectionUsesOther(
  field: SchemaField,
  value: string | number | boolean | undefined,
): boolean {
  if (!field.allowOther && !field.options?.some((o) => o.value === OTHER_OPTION_VALUE)) return false;
  if (field.type === "multiselect" || field.type === "checkbox") {
    return parseMultiValue(value).includes(OTHER_OPTION_VALUE);
  }
  return String(value ?? "") === OTHER_OPTION_VALUE;
}

export function schemaFingerprint(schema: { sections: { fields: SchemaField[] }[] }): string {
  return schema.sections
    .map((s) =>
      s.fields
        .map(
          (f) =>
            `${f.id}:${f.type}:${f.label}:${f.required}:${f.span}:${f.placeholder}:${f.hint}:${f.allowOther}:${f.defaultValue}:${(f.options ?? []).map((o) => `${o.value}|${o.label}`).join(";")}`,
        )
        .join(","),
    )
    .join("|");
}
