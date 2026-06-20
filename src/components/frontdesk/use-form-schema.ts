"use client";

import {
  getFormSchema,
  type FormSchemaId,
} from "@/lib/schema-registry";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { useEffect, useState } from "react";

export function useFormSchema(formId: FormSchemaId): FormSchema {
  const [schema, setSchema] = useState<FormSchema>(() => getFormSchema(formId));

  useEffect(() => {
    setSchema(getFormSchema(formId));
    const refresh = () => setSchema(getFormSchema(formId));
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

  return schema;
}
