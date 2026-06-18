"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormSchema, SchemaField } from "@/design-system/frontdesk-schemas";
import { validateFormValues } from "@/lib/schema-registry";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function SchemaFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  const base = cn(
    "rounded-md border border-[var(--attio-border)] bg-white text-[13px] text-[var(--attio-text)]",
    "placeholder:text-[var(--attio-text-tertiary)] focus-visible:border-[var(--attio-text-tertiary)] focus-visible:ring-0 focus-visible:outline-none",
  );

  if (field.type === "section" || field.type === "divider" || field.type === "help") return null;

  if (field.type === "formula" || field.readOnly) {
    return (
      <div className={cn(base, "flex h-9 items-center bg-[var(--attio-surface)] px-3 text-[var(--attio-text-tertiary)]")}>
        {String(value ?? field.defaultValue ?? "Computed")}
      </div>
    );
  }

  if (field.type === "rating" || field.type === "pain-scale") {
    return (
      <input type="range" min={0} max={10} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    );
  }

  if (field.type === "multiselect" || field.type === "checkbox") {
    return (
      <div className="space-y-1">
        {field.options?.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={String(value).includes(o.value)} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-1">
        {field.options?.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-[12px]">
            <input type="radio" name={field.id} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "file" || field.type === "image" || field.type === "signature") {
    return (
      <div className={cn(base, "flex h-20 items-center justify-center border-dashed text-[12px] text-[var(--attio-text-tertiary)]")}>
        {field.type === "signature" ? "Signature pad (capture in module)" : "Upload (file picker in module)"}
      </div>
    );
  }

  if (field.type === "consent-version") {
    return (
      <label className="flex items-start gap-2 text-[12px]">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>I consent · template v2026.1</span>
      </label>
    );
  }

  if (["icd-picker", "body-region", "allergy-list", "vitals-group", "package-picker", "discount-percent", "payment-mode"].includes(field.type)) {
    return (
      <Select value={String(value ?? "")} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger className={cn(base, "h-9 w-full")}>
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
        className={cn(base, "min-h-[80px] resize-none")}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select value={String(value ?? "")} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger className={cn(base, "h-9 w-full")}>
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((o) => (
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
          "relative h-6 w-11 rounded-full transition-colors",
          value ? "bg-zinc-900" : "bg-zinc-200",
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
      className={cn(base, "h-9")}
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
}: {
  schema: FormSchema;
  onSubmit?: (data: Record<string, string | number | boolean>) => void;
  submitLabel?: string;
  className?: string;
  initialValues?: Record<string, string | number | boolean>;
  formKey?: string;
}) {
  const [values, setValues] = useState(() => defaultValues(schema, initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(defaultValues(schema, initialValues));
    setErrors({});
  }, [formKey, schema.id]);

  const set = (id: string, v: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <form
      className={cn("space-y-8", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const nextErrors = validateFormValues(schema, values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) onSubmit?.(values);
      }}
    >
      {schema.sections.map((section) => (
        <div key={section.id}>
          <h3 className="mb-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--attio-text-tertiary)] uppercase">
            {section.label}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              if (field.type === "divider") {
                return <hr key={field.id} className="sm:col-span-2 border-[var(--attio-border-subtle)]" />;
              }
              if (field.type === "help") {
                return (
                  <p key={field.id} className="sm:col-span-2 text-[12px] text-[var(--attio-text-tertiary)]">{field.hint ?? field.label}</p>
                );
              }
              if (field.type === "section") {
                return (
                  <h4 key={field.id} className="sm:col-span-2 text-[13px] font-semibold">{field.label}</h4>
                );
              }
              return (
              <div
                key={field.id}
                className={cn(
                  "space-y-1.5",
                  field.span === 2 && "sm:col-span-2",
                  field.type === "toggle" && "flex items-center justify-between sm:col-span-2",
                )}
              >
                <Label className="text-[12px] font-medium text-[var(--attio-text-secondary)]">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </Label>
                {field.type !== "toggle" && (
                  <SchemaFieldInput field={field} value={values[field.id]} onChange={(v) => set(field.id, v)} />
                )}
                {field.type === "toggle" && (
                  <SchemaFieldInput field={field} value={values[field.id]} onChange={(v) => set(field.id, v)} />
                )}
                {field.hint && (
                  <p className="text-[11px] text-zinc-400">{field.hint}</p>
                )}
                {errors[field.id] && (
                  <p className="text-[11px] text-red-600">{errors[field.id]}</p>
                )}
              </div>
              );
            })}
          </div>
        </div>
      ))}
      {onSubmit && (
        <button
          type="submit"
          className="h-8 rounded-md bg-[var(--attio-text)] px-3 text-[12px] font-medium text-white hover:bg-[#333]"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
