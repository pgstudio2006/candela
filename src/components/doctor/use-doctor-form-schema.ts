"use client";

import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { getDoctorFormSchema, type DoctorFormSchemaId } from "@/lib/schema-registry";
import { useEffect, useState } from "react";

export function useDoctorFormSchema(formId: DoctorFormSchemaId): FormSchema {
  const [schema, setSchema] = useState<FormSchema>(() => getDoctorFormSchema(formId));

  useEffect(() => {
    const refresh = () => setSchema(getDoctorFormSchema(formId));
    refresh();
    window.addEventListener("candela-schema-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("candela-schema-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [formId]);

  return schema;
}
