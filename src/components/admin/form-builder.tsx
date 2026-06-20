"use client";

import {
  DOCTOR_FORM_SCHEMA_IDS,
  FORM_SCHEMA_IDS,
  getDoctorFormSchema,
  getFormSchema,
  newFieldId,
  setSchemaOverrideCache,
  type DoctorFormSchemaId,
  type FormSchemaId,
} from "@/lib/schema-registry";
import type { FieldType, FormSchema, SchemaField } from "@/design-system/frontdesk-schemas";
import { FIELD_TYPE_CATALOG, FORM_DEPARTMENTS, type FormDepartment } from "@/design-system/admin-data";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  listFormSchemaOverrides,
  resetFormSchemaOverride,
  saveFormSchemaOverride,
} from "@/server/admin/actions";

type SchemaGroup = FormDepartment;

const ALL_SCHEMA_OPTIONS: { group: SchemaGroup; id: FormSchemaId | DoctorFormSchemaId; label: string }[] = [
  ...FORM_SCHEMA_IDS.map((id) => ({ group: "frontdesk" as const, id, label: id.replace(/-/g, " ") })),
  ...DOCTOR_FORM_SCHEMA_IDS.map((id) => ({ group: "doctor" as const, id, label: id.replace(/^doctor-/, "").replace(/-/g, " ") })),
];

const FIELD_CATEGORIES = ["basic", "numeric", "datetime", "choice", "clinical", "commercial", "media", "layout", "compliance", "computed"] as const;

function loadSchema(id: FormSchemaId | DoctorFormSchemaId): FormSchema {
  if ((DOCTOR_FORM_SCHEMA_IDS as readonly string[]).includes(id)) {
    return getDoctorFormSchema(id as DoctorFormSchemaId);
  }
  return getFormSchema(id as FormSchemaId);
}

export function AdminFormBuilder() {
  const [activeId, setActiveId] = useState<FormSchemaId | DoctorFormSchemaId>("registration");
  const [deptFilter, setDeptFilter] = useState<SchemaGroup>("frontdesk");
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
    setSchema(loadSchema(activeId));
    setSaved(false);
  }, [activeId, ready]);

  const allFields = schema.sections.flatMap((s) => s.fields);
  const filteredSchemas = ALL_SCHEMA_OPTIONS.filter((s) => s.group === deptFilter);

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
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">Select Front Desk or Doctor for editable schemas · other departments use shared templates in UI phase</p>
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
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {section.fields.map((field) => (
              <li key={field.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_140px_100px_80px_auto] sm:items-center">
                <input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  className="h-8 rounded-md border border-[var(--attio-border)] px-2 text-[13px]"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  className="h-8 rounded-md border border-[var(--attio-border)] px-2 text-[11px]"
                >
                  {FIELD_TYPE_CATALOG.map((t) => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
                <span className="text-[10px] capitalize text-[var(--attio-text-tertiary)]">{field.category ?? "—"}</span>
                <label className="flex items-center gap-1 text-[12px]">
                  <input type="checkbox" checked={Boolean(field.required)} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                  Req
                </label>
                <button type="button" onClick={() => removeField(field.id)} className="text-[12px] text-red-600 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
