"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import type { Patient } from "@/design-system/frontdesk-data";
import type { FormSchema } from "@/design-system/frontdesk-schemas";
import { usePublishedFormSchema } from "@/hooks/use-published-form-schema";
import type { ClinicalRoster } from "@/lib/clinical-roster";

type PublishedSchemaFormProps = {
  schemaId?: string;
  schema?: FormSchema;
  onSubmit?: (data: Record<string, string | number | boolean>) => void;
  onValuesChange?: (data: Record<string, string | number | boolean>) => void;
  submitLabel?: string;
  hideSubmit?: boolean;
  className?: string;
  initialValues?: Record<string, string | number | boolean>;
  formKey?: string;
  searchPatients?: Patient[];
  roster?: ClinicalRoster | null;
};

/** Renders a module form from the universal schema registry + admin-published overrides. */
export function PublishedSchemaForm({
  schemaId,
  schema: schemaOverride,
  ...props
}: PublishedSchemaFormProps) {
  const published = usePublishedFormSchema(schemaId ?? schemaOverride?.id ?? "registration");
  const schema = schemaOverride ?? published;
  return <SchemaForm schema={schema} {...props} />;
}
