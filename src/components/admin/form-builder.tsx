"use client";

import {
  getAnyFormSchema,
  listSchemasForDepartment,
  newFieldId,
  setSchemaOverrideCache,
} from "@/lib/schema-registry";
import type { FieldType, FormSchema, SchemaField } from "@/design-system/frontdesk-schemas";
import { FIELD_TYPE_CATALOG, FORM_DEPARTMENTS, type FormDepartment } from "@/design-system/admin-data";
import { FormFieldEditor } from "@/components/admin/form-field-editor";
import { SchemaForm } from "@/components/candela/schema-form";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { schemaUsageLabel } from "@/lib/schema-usage";
import { schemaFingerprint } from "@/lib/schema-field-utils";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  listFormSchemaOverrides,
  resetFormSchemaOverride,
  saveFormSchemaOverride,
} from "@/server/admin/actions";

type SchemaGroup = FormDepartment;

const FIELD_CATEGORIES = ["basic", "numeric", "datetime", "choice", "clinical", "commercial", "media", "layout", "compliance", "computed"] as const;

function loadSchema(id: string): FormSchema {
  return getAnyFormSchema(id);
}

export function AdminFormBuilder() {
  const initialDept = "frontdesk";
  const initialSchemas = listSchemasForDepartment(initialDept);
  const [activeId, setActiveId] = useState<string>(initialSchemas[0]?.id ?? "registration");
  const [deptFilter, setDeptFilter] = useState<SchemaGroup>(initialDept);
  const [schema, setSchema] = useState<FormSchema>(() => loadSchema("registration"));
  const [saved, setSaved] = useState(false);
  const [addType, setAddType] = useState<FieldType>("text");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const overrides = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      setSchema(loadSchema(activeId));
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const options = listSchemasForDepartment(deptFilter);
    if (!options.some((o) => o.id === activeId) && options[0]) {
      setActiveId(options[0].id);
    }
  }, [deptFilter, ready, activeId]);

  useEffect(() => {
    if (!ready) return;
    setSchema(loadSchema(activeId));
    setSaved(false);
  }, [activeId, ready]);

  const allFields = schema.sections.flatMap((s) => s.fields);
  const filteredSchemas = listSchemasForDepartment(deptFilter);
  const previewKey = schemaFingerprint(schema);

  const fieldsByCategory = useMemo(() => {
    const map = new Map<string, typeof FIELD_TYPE_CATALOG>();
    for (const cat of FIELD_CATEGORIES) {
      map.set(cat, FIELD_TYPE_CATALOG.filter((f) => f.category === cat));
    }
    return map;
  }, []);

  const updateField = (fieldId: string, patch: Partial<SchemaField>) => {
    setSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        fields: section.fields.map((f) => (f.id === fieldId ? { ...f, ...patch, category: FIELD_TYPE_CATALOG.find((c) => c.type === (patch.type ?? f.type))?.category } : f)),
      })),
    }));
    setSaved(false);
  };

  const removeField = (fieldId: string) => {
    setSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((f) => f.id !== fieldId),
      })),
    }));
    setSaved(false);
  };

  const addField = (sectionId: string) => {
    const meta = FIELD_TYPE_CATALOG.find((f) => f.type === addType);
    const label = meta?.label ?? "New field";
    setSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const field: SchemaField = {
          id: newFieldId(label, allFields),
          type: addType,
          label,
          category: meta?.category,
          ...(addType === "select" || addType === "radio" || addType === "multiselect" ? { options: [{ value: "opt1", label: "Option 1" }] } : {}),
          ...(addType === "help" ? { hint: "Help text for users" } : {}),
          ...(addType === "formula" ? { readOnly: true, defaultValue: "Computed" } : {}),
        };
        return { ...section, fields: [...section.fields, field] };
      }),
    }));
    setSaved(false);
  };

  const publish = () => {
    void (async () => {
      await saveFormSchemaOverride(schema);
      const overrides = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      setSchema(loadSchema(activeId));
      setSaved(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-schema-updated"));
        try {
          new BroadcastChannel("candela-schema").postMessage({ type: "updated", at: Date.now() });
        } catch {
          /* ignore */
        }
      }
    })();
  };

  const reset = () => {
    void (async () => {
      await resetFormSchemaOverride(activeId);
      const overrides = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      setSchema(loadSchema(activeId));
      setSaved(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-schema-updated"));
        try {
          new BroadcastChannel("candela-schema").postMessage({ type: "updated", at: Date.now() });
        } catch {
          /* ignore */
        }
      }
    })();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--attio-text-tertiary)]">Department scope</p>
        <div className="flex flex-wrap gap-2">
          {FORM_DEPARTMENTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeptFilter(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize",
                deptFilter === d ? "bg-[var(--attio-text)] text-white" : "border border-[var(--attio-border)]",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] px-3 py-2 text-[12px] text-[var(--attio-text-secondary)]">
        <span className="font-medium text-[var(--attio-text)]">Live in Candela:</span> {schemaUsageLabel(activeId)}
      </p>

      <div className="flex flex-wrap gap-2">
        {filteredSchemas.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveId(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize",
              activeId === id ? "bg-[var(--attio-accent)] text-white" : "border border-[var(--attio-border)]",
            )}
          >
            {label}
          </button>
        ))}
        {filteredSchemas.length === 0 && (
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">No schemas defined for this department yet.</p>
        )}
      </div>

      <Panel title="Field type catalog" action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">{FIELD_TYPE_CATALOG.length} types</span>}>
        <div className="grid gap-4 lg:grid-cols-2">
          {FIELD_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-[11px] font-medium uppercase text-[var(--attio-text-tertiary)]">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {fieldsByCategory.get(cat)?.map((f) => (
                  <button
                    key={f.type}
                    type="button"
                    onClick={() => setAddType(f.type)}
                    className={cn(
                      "rounded border px-2 py-1 text-[10px]",
                      addType === f.type ? "border-[var(--attio-accent)] bg-blue-50/50" : "border-[var(--attio-border-subtle)]",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[var(--attio-text-secondary)]">Selected for add: <strong>{FIELD_TYPE_CATALOG.find((f) => f.type === addType)?.label}</strong></p>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <AttioButton variant="primary" onClick={publish}>Publish schema</AttioButton>
        <AttioButton variant="secondary" onClick={reset}>Reset to default</AttioButton>
        {saved && <span className="self-center text-[12px] text-green-700">Published — all workspaces update immediately</span>}
      </div>

      {schema.sections.map((section) => (
        <Panel
          key={section.id}
          title={section.label}
          action={
            <AttioButton variant="secondary" className="h-7 text-[11px]" onClick={() => addField(section.id)}>
              Add {addType}
            </AttioButton>
          }
        >
          <ul className="space-y-3">
            {section.fields.map((field) => (
              <FormFieldEditor
                key={field.id}
                field={field}
                onChange={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </ul>
        </Panel>
      ))}

      <Panel title="Live preview" action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">Updates as you edit</span>}>
        <div className="rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-canvas)] p-4">
          <SchemaForm key={previewKey} schema={schema} submitLabel="Preview submit" hideSubmit />
        </div>
      </Panel>
    </div>
  );
}
