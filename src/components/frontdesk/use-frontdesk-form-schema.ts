"use client";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { doctorsForDepartment, type ClinicalRoster } from "@/lib/clinical-roster";
import { getFormSchema, type FormSchemaId } from "@/lib/schema-registry";
import { useEffect, useMemo, useState } from "react";

function onPublishedSchemaEvent(formId: string, refresh: () => void) {
  return (event: Event) => {
    const detail = (event as CustomEvent<{ id?: string }>).detail;
    if (!detail?.id || detail.id === formId) refresh();
  };
}

function patchSchemaWithRoster(
  base: FormSchema,
  roster: ClinicalRoster | null,
  departmentId?: string,
): FormSchema {
  if (!roster) return base;

  const deptOptions = roster.departments.map((d) => ({ value: d.id, label: d.label }));
  const deptDoctors = doctorsForDepartment(roster, departmentId ?? roster.departments[0]?.id ?? "");
  const doctorOptions = deptDoctors.map((d) => ({ value: d.id, label: d.name }));

  return {
    ...base,
    sections: base.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.id === "department" && field.type === "select") {
          return { ...field, options: deptOptions.length ? deptOptions : field.options };
        }
        if (field.id === "doctor" && field.type === "select") {
          return {
            ...field,
            options: doctorOptions.length ? doctorOptions : field.options,
          };
        }
        return field;
      }),
    })),
  };
}

export function useFrontdeskFormSchema(
  formId: FormSchemaId,
  roster: ClinicalRoster | null,
  departmentId?: string,
): FormSchema {
  const [base, setBase] = useState<FormSchema>(() => getFormSchema(formId));

  useEffect(() => {
    const refresh = () => setBase(getFormSchema(formId));
    refresh();
    const onSchemaUpdated = onPublishedSchemaEvent(formId, refresh);
    window.addEventListener("candela-schema-updated", onSchemaUpdated);
    window.addEventListener("storage", refresh);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("candela-schema");
      channel.onmessage = refresh;
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("candela-schema-updated", onSchemaUpdated);
      window.removeEventListener("storage", refresh);
      channel?.close();
    };
  }, [formId]);

  return useMemo(
    () => patchSchemaWithRoster(base, roster, departmentId),
    [base, roster, departmentId],
  );
}
