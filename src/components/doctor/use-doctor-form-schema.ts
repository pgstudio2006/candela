"use client";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { getDoctorFormSchema, type DoctorFormSchemaId } from "@/lib/schema-registry";
import { getIcdOptionsAction } from "@/app/actions/catalog-actions";
import { useEffect, useState } from "react";

function onPublishedSchemaEvent(formId: string, refresh: () => void) {
  return (event: Event) => {
    const detail = (event as CustomEvent<{ id?: string }>).detail;
    if (!detail?.id || detail.id === formId) refresh();
  };
}

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
    const onSchemaUpdated = onPublishedSchemaEvent(formId, () => void refresh());
    void refresh();
    window.addEventListener("candela-schema-updated", onSchemaUpdated);
    window.addEventListener("storage", () => void refresh());
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("candela-schema");
      channel.onmessage = () => void refresh();
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("candela-schema-updated", onSchemaUpdated);
      window.removeEventListener("storage", () => void refresh());
      channel?.close();
    };
  }, [formId]);

  return schema;
}
