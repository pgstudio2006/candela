"use client";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { getDoctorFormSchema, type DoctorFormSchemaId } from "@/lib/schema-registry";
import { getIcdOptionsAction } from "@/app/actions/catalog-actions";
import { useEffect, useState } from "react";

function mergeIcdOptions(schema: FormSchema, icdOptions: { value: string; label: string }[]): FormSchema {
  if (!icdOptions.length) return schema;
  return {
    ...schema,
    sections: schema.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.id === "icdTag" || field.label?.toLowerCase().includes("icd")
          ? { ...field, options: icdOptions }
          : field,
      ),
    })),
  };
}

export function useDoctorFormSchema(formId: DoctorFormSchemaId): FormSchema {
  const [schema, setSchema] = useState<FormSchema>(() => getDoctorFormSchema(formId));

  useEffect(() => {
    const refresh = async () => {
      let next = getDoctorFormSchema(formId);
      if (formId === "doctor-diagnosis") {
        const icdOptions = await getIcdOptionsAction();
        next = mergeIcdOptions(next, icdOptions);
      }
      setSchema(next);
    };
    void refresh();
    window.addEventListener("candela-schema-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("candela-schema-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [formId]);

  return schema;
}
