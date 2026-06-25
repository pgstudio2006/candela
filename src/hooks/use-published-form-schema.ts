"use client";

import { getAnyFormSchema } from "@/lib/schema-registry";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { useEffect, useState } from "react";

/** Live published form schema for any Candela module (frontdesk, doctor, nurse, etc.). */
export function usePublishedFormSchema(schemaId: string): FormSchema {
  const [schema, setSchema] = useState<FormSchema>(() => getAnyFormSchema(schemaId));

  useEffect(() => {
    const refresh = () => setSchema(getAnyFormSchema(schemaId));
    refresh();
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
  }, [schemaId]);

  return schema;
}
