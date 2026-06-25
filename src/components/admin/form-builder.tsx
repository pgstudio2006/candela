"use client";

import {
  getAnyFormSchema,
  listSchemasForDepartment,
  newFieldId,
  SCHEMA_CATALOG,
  setSchemaOverrideCache,
} from "@/lib/schema-registry";
import type { FieldType, FormSchema, SchemaField } from "@/design-system/frontdesk-schemas";
import { FIELD_TYPE_CATALOG, FORM_DEPARTMENTS, type FormDepartment } from "@/design-system/admin-data";
import { FormFieldEditor } from "@/components/admin/form-field-editor";
import { SchemaForm } from "@/components/candela/schema-form";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { schemaLiveRoute, schemaUsageLabel } from "@/lib/schema-usage";
import { schemaFingerprint } from "@/lib/schema-field-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listFormSchemaOverrides,
  resetFormSchemaOverride,
  saveFormSchemaOverride,
} from "@/server/admin/actions";

type SchemaGroup = FormDepartment;

const FIELD_CATEGORIES = ["basic", "numeric", "datetime", "choice", "clinical", "commercial", "media", "layout", "compliance", "computed"] as const;

function catalogLabel(schemaId: string): string {
  return SCHEMA_CATALOG.find((entry) => entry.id === schemaId)?.label ?? schemaId;
}

function loadSchema(id: string): FormSchema {
  const loaded = getAnyFormSchema(id);
  return { ...loaded, id, title: catalogLabel(id) };
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
  const [purgedNotice, setPurgedNotice] = useState<string | null>(null);

  const selectSchema = useCallback(
    (id: string) => {
      setActiveId(id);
      if (ready) setSchema(loadSchema(id));
    },
    [ready],
  );

  useEffect(() => {
    void (async () => {
      const { overrides, purgedIds } = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      if (purgedIds.length > 0) {
        setPurgedNotice(
          `Fixed ${purgedIds.length} corrupted form(s) that had registration fields on the wrong schema (${purgedIds.join(", ")}). Each now uses its correct default until you publish again.`,
        );
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const options = listSchemasForDepartment(deptFilter);
    if (!options.some((o) => o.id === activeId) && options[0]) {
      selectSchema(options[0].id);
    }
  }, [deptFilter, ready, activeId, selectSchema]);

  useEffect(() => {
    if (!ready) return;
    setSchema(loadSchema(activeId));
    setSaved(false);
  }, [activeId, ready]);

  const allFields = schema.sections.flatMap((s) => s.fields);
  const filteredSchemas = listSchemasForDepartment(deptFilter);
  const previewKey = `${activeId}:${schemaFingerprint(schema)}`;
  const liveRoute = schemaLiveRoute(activeId);
  const activeLabel = catalogLabel(activeId);

  const pinSchemaMeta = (next: FormSchema): FormSchema => ({
    ...next,
    id: activeId,
    title: activeLabel,
  });

  const fieldsByCategory = useMemo(() => {
    const map = new Map<string, typeof FIELD_TYPE_CATALOG>();
    for (const cat of FIELD_CATEGORIES) {
      map.set(cat, FIELD_TYPE_CATALOG.filter((f) => f.category === cat));
    }
    return map;
  }, []);

  const updateField = (fieldId: string, patch: Partial<SchemaField>) => {
    setSchema((prev) =>
      pinSchemaMeta({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          fields: section.fields.map((f) =>
            f.id === fieldId
              ? {
                  ...f,
                  ...patch,
                  category: FIELD_TYPE_CATALOG.find((c) => c.type === (patch.type ?? f.type))?.category,
                }
              : f,
          ),
        })),
      }),
    );
    setSaved(false);
  };

  const removeField = (fieldId: string) => {
    setSchema((prev) =>
      pinSchemaMeta({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((f) => f.id !== fieldId),
        })),
      }),
    );
    setSaved(false);
  };

  const addField = (sectionId: string) => {
    const meta = FIELD_TYPE_CATALOG.find((f) => f.type === addType);
    const label = meta?.label ?? "New field";
    setSchema((prev) =>
      pinSchemaMeta({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const field: SchemaField = {
            id: newFieldId(label, allFields),
            type: addType,
            label,
            category: meta?.category,
            ...(addType === "select" || addType === "radio" || addType === "multiselect"
              ? { options: [{ value: "opt1", label: "Option 1" }] }
              : {}),
            ...(addType === "help" ? { hint: "Help text for users" } : {}),
            ...(addType === "formula" ? { readOnly: true, defaultValue: "Computed" } : {}),
          };
          return { ...section, fields: [...section.fields, field] };
        }),
      }),
    );
    setSaved(false);
  };

  const publish = () => {
    void (async () => {
      const payload = pinSchemaMeta(schema);
      await saveFormSchemaOverride(payload, activeId);
      const { overrides } = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      setSchema(loadSchema(activeId));
      setSaved(true);
      setPurgedNotice(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-schema-updated", { detail: { id: activeId } }));
        try {
          new BroadcastChannel("candela-schema").postMessage({ type: "updated", id: activeId, at: Date.now() });
        } catch {
          /* ignore */
        }
      }
    })();
  };

  const reset = () => {
    void (async () => {
      await resetFormSchemaOverride(activeId);
      const { overrides } = await listFormSchemaOverrides();
      setSchemaOverrideCache(overrides);
      setSchema(loadSchema(activeId));
      setSaved(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-schema-updated", { detail: { id: activeId } }));
        try {
          new BroadcastChannel("candela-schema").postMessage({ type: "updated", id: activeId, at: Date.now() });
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

      {purgedNotice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          {purgedNotice}
        </p>
      )}

      <p className="rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] px-3 py-2 text-[12px] text-[var(--attio-text-secondary)]">
        <span className="font-medium text-[var(--attio-text)]">Editing:</span> {activeLabel}{" "}
        <span className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">({activeId})</span>
        <span className="mx-2 text-[var(--attio-border)]">·</span>
        <span className="font-medium text-[var(--attio-text)]">Live in Candela:</span> {schemaUsageLabel(activeId)}
        {liveRoute && (
          <>
            <span className="mx-2 text-[var(--attio-border)]">·</span>
            <Link href={liveRoute} className="font-medium text-[var(--attio-accent)] hover:underline">
              Open live screen →
            </Link>
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {filteredSchemas.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectSchema(id)}
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
          key={`${activeId}-${section.id}`}
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
                key={`${activeId}-${field.id}`}
                field={field}
                onChange={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </ul>
        </Panel>
      ))}

      <Panel title={`Live preview · ${activeLabel}`} action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">Updates as you edit</span>}>
        <div className="rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-canvas)] p-4">
          <SchemaForm key={previewKey} schema={pinSchemaMeta(schema)} submitLabel="Preview submit" hideSubmit />
        </div>
      </Panel>
    </div>
  );
}
