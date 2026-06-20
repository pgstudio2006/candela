"use client";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { doctorsForDepartment, type ClinicalRoster } from "@/lib/clinical-roster";
import { getFormSchema, type FormSchemaId } from "@/lib/schema-registry";
import { useEffect, useMemo, useState } from "react";

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
    setBase(getFormSchema(formId));
    const refresh = () => setBase(getFormSchema(formId));
    window.addEventListener("candela-schema-updated", refresh);
    window.addEventListener("storage", refresh);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("candela-schema");
      channel.onmessage = refresh;
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("candela-schema-updated", refresh);
      window.removeEventListener("storage", refresh);
      channel?.close();
    };
  }, [formId]);

  return useMemo(
    () => patchSchemaWithRoster(base, roster, departmentId),
    [base, roster, departmentId],
  );
}
