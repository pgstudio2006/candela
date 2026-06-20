"use client";

import { FormField, FormGrid, FormSection } from "@/components/candela/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormSchema, SchemaField } from "@/design-system/frontdesk-schemas";
import { PatientSearchField } from "@/components/frontdesk/patient-search-field";
import type { Patient } from "@/design-system/frontdesk-data";
import { deptLabelFromRoster, resolveDoctorName, type ClinicalRoster } from "@/lib/clinical-roster";
import { deptLabel } from "@/lib/frontdesk-workflow";
import { validateFormValues } from "@/lib/schema-registry";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

function humanizeSelectValue(value: string, fieldId: string, roster?: ClinicalRoster | null): string {
  if (fieldId === "department" || value.startsWith("dept_")) {
    return roster ? deptLabelFromRoster(value, roster) : deptLabel(value);
  }
  if (fieldId === "doctor" || value.startsWith("dr_")) return resolveDoctorName(value, roster);
  return value.replace(/_/g, " ");
}

function SchemaFieldInput({
  field,
  value,
  onChange,
  searchPatients,
  roster,
}: {
  field: SchemaField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  searchPatients?: Patient[];
  roster?: ClinicalRoster | null;
}) {
  const readOnlyClass = "flex h-9 items-center rounded-md border border-[var(--attio-border)] bg-[var(--attio-surface)] px-3 text-[13px] text-[var(--attio-text-tertiary)]";

  if (field.type === "section" || field.type === "divider" || field.type === "help") return null;

  if (field.type === "formula" || field.readOnly) {
    return <div className={readOnlyClass}>{String(value ?? field.defaultValue ?? "Computed")}</div>;
  }

  if (field.type === "rating" || field.type === "pain-scale") {
    return (
      <input type="range" min={0} max={10} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--attio-text)]" />
    );
  }

  if (field.type === "multiselect" || field.type === "checkbox") {
    return (
      <div className="space-y-2 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] p-3">
        {field.options?.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={String(value).includes(o.value)} onChange={() => onChange(o.value)} className="size-4 rounded border-[var(--attio-border)]" />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-2 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] p-3">
        {field.options?.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-[13px]">
            <input type="radio" name={field.id} checked={value === o.value} onChange={() => onChange(o.value)} className="size-4" />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "file" || field.type === "image" || field.type === "signature") {
    return (
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-[var(--attio-border)] bg-[var(--attio-surface)] text-[12px] text-[var(--attio-text-tertiary)]">
        {field.type === "signature" ? "Signature pad (capture in module)" : "Upload (file picker in module)"}
      </div>
    );
  }

  if (field.type === "consent-version") {
    return (
      <label className="flex items-start gap-2 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] p-3 text-[13px]">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 rounded border-[var(--attio-border)]" />
        <span>I consent · template v2026.1</span>
      </label>
    );
  }

  if (["icd-picker", "body-region", "allergy-list", "vitals-group", "package-picker", "discount-percent", "payment-mode"].includes(field.type)) {
    return (
      <Select value={String(value ?? "")} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${field.label}…`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? [{ value: "demo", label: "Demo option" }]).map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="min-h-[88px] resize-y"
      />
    );
  }

  if ((field.id === "uhid" || field.id === "patient") && searchPatients) {
    return (
      <PatientSearchField
        value={String(value ?? "")}
        patients={searchPatients}
        placeholder={field.placeholder ?? "Search by UHID, phone, or name…"}
        onChange={(q) => onChange(q)}
      />
    );
  }

  if (field.type === "select") {
    const raw = String(value ?? "");
    let options = [...(field.options ?? [])];
    if (raw && !options.some((o) => o.value === raw)) {
      options = [{ value: raw, label: humanizeSelectValue(raw, field.id, roster) }, ...options];
    }
    return (
      <Select value={raw || undefined} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "toggle") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(value)}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-[var(--attio-text)]" : "bg-[var(--attio-border)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            value ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "number" || field.type === "currency" || field.type === "percent"
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "time" || field.type === "duration"
              ? "time"
              : field.type === "datetime"
                ? "datetime-local"
                : field.type === "url"
                  ? "url"
                  : field.type === "password"
                    ? "password"
                    : "text";

  return (
    <Input
      type={inputType}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) =>
        onChange(
          field.type === "number" || field.type === "currency" || field.type === "percent"
            ? Number(e.target.value)
            : e.target.value,
        )
      }
      placeholder={field.placeholder}
    />
  );
}

function defaultValues(
  schema: FormSchema,
  initial?: Record<string, string | number | boolean>,
) {
  const vals: Record<string, string | number | boolean> = {};
  for (const section of schema.sections) {
    for (const f of section.fields) {
      if (initial && initial[f.id] !== undefined) vals[f.id] = initial[f.id];
      else if (f.defaultValue !== undefined) vals[f.id] = f.defaultValue;
      else if (f.type === "toggle") vals[f.id] = false;
      else vals[f.id] = "";
    }
  }
  return vals;
}

export function SchemaForm({
  schema,
  onSubmit,
  submitLabel = "Save",
  className,
  initialValues,
  formKey,
  onValuesChange,
  searchPatients,
  roster,
}: {
  schema: FormSchema;
  onSubmit?: (data: Record<string, string | number | boolean>) => void;
  submitLabel?: string;
  className?: string;
  initialValues?: Record<string, string | number | boolean>;
  formKey?: string;
  onValuesChange?: (values: Record<string, string | number | boolean>) => void;
  searchPatients?: Patient[];
  roster?: ClinicalRoster | null;
}) {
  const [values, setValues] = useState(() => defaultValues(schema, initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialKey = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);

  useEffect(() => {
    setValues(defaultValues(schema, initialValues));
    setErrors({});
  }, [formKey, schema.id, initialKey, initialValues, schema]);

  const set = (id: string, v: string | number | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [id]: v };
      onValuesChange?.(next);
      return next;
    });
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <form
      className={cn("candela-form space-y-[var(--cf-section-gap,1.5rem)]", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const nextErrors = validateFormValues(schema, values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) onSubmit?.(values);
      }}
    >
      {schema.sections.map((section) => (
        <FormSection key={section.id} title={section.label}>
          <FormGrid cols={2}>
            {section.fields.map((field) => {
              if (field.type === "divider") {
                return <hr key={field.id} className="sm:col-span-2 border-[var(--attio-border-subtle)]" />;
              }
              if (field.type === "help") {
                return (
                  <p key={field.id} className="sm:col-span-2 text-[12px] leading-relaxed text-[var(--attio-text-tertiary)]">
                    {field.hint ?? field.label}
                  </p>
                );
              }
              if (field.type === "section") {
                return (
                  <h4 key={field.id} className="sm:col-span-2 text-[13px] font-semibold text-[var(--attio-text)]">
                    {field.label}
                  </h4>
                );
              }

              if (field.type === "toggle") {
                return (
                  <FormField key={field.id} label={field.label} required={field.required} hint={field.hint} error={errors[field.id]} span={2} row>
                    <SchemaFieldInput field={field} value={values[field.id]} onChange={(v) => set(field.id, v)} searchPatients={searchPatients} roster={roster} />
                  </FormField>
                );
              }

              return (
                <FormField
                  key={field.id}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                  error={errors[field.id]}
                  span={field.span === 2 ? 2 : 1}
                >
                  <SchemaFieldInput field={field} value={values[field.id]} onChange={(v) => set(field.id, v)} searchPatients={searchPatients} roster={roster} />
                </FormField>
              );
            })}
          </FormGrid>
        </FormSection>
      ))}
      {onSubmit && (
        <button
          type="submit"
          className="h-9 rounded-md bg-[var(--attio-text)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
