"use client";

import { AttioButton } from "@/components/frontdesk/ui";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

export function formControlClass(className?: string) {
  return cn(className);
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  span = 1,
  row,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4;
  row?: boolean;
}) {
  const spanClass =
    span === 4
      ? "sm:col-span-2 lg:col-span-4"
      : span === 3
        ? "sm:col-span-2 lg:col-span-3"
        : span === 2
          ? "sm:col-span-2"
          : undefined;

  return (
    <div
      className={cn(
        row ? "flex items-center justify-between gap-3 sm:col-span-2" : "flex flex-col gap-[var(--cf-field-gap,0.375rem)]",
        spanClass,
        className,
      )}
    >
      <Label
        htmlFor={htmlFor}
        className={cn(
          "text-[length:var(--cf-label-size,12px)] font-medium leading-none text-[var(--attio-text-secondary)]",
          row && "shrink-0",
        )}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <div className={cn("min-w-0", row && "flex-1")}>
        {children}
        {hint && !error && <p className="mt-1 text-[11px] leading-snug text-[var(--attio-text-tertiary)]">{hint}</p>}
        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--attio-text-tertiary)]">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] text-[var(--attio-text-tertiary)]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === 1
          ? "grid-cols-1"
          : "sm:grid-cols-2";

  return <div className={cn("grid grid-cols-1 gap-[var(--cf-grid-gap,1rem)]", colClass, className)}>{children}</div>;
}

export function FormActions({
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading,
  className,
}: {
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-end gap-2 border-t border-[var(--attio-border-subtle)] pt-4", className)}>
      {onCancel && (
        <AttioButton type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </AttioButton>
      )}
      <AttioButton type="submit" variant="primary" disabled={loading}>
        {loading ? "Saving…" : submitLabel}
      </AttioButton>
    </div>
  );
}

export function FormBody({
  children,
  className,
  onSubmit,
}: {
  children: ReactNode;
  className?: string;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={cn("candela-form space-y-[var(--cf-section-gap,1.5rem)]", className)}>
      {children}
    </form>
  );
}

export function FormModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  if (!open) return null;

  const maxW =
    size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-md" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-[var(--attio-border)] bg-white shadow-2xl sm:rounded-xl",
          maxW,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--attio-border-subtle)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[var(--attio-text)]">{title}</h2>
            {description && <p className="mt-0.5 text-[12px] text-[var(--attio-text-tertiary)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[var(--attio-text-tertiary)] transition-colors hover:bg-[var(--attio-hover)] hover:text-[var(--attio-text)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-[var(--attio-border-subtle)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function FormNativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select className={cn("candela-native-select", className)} {...props}>
      {children}
    </select>
  );
}

export function FormCheckbox({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] px-3 py-2.5 text-[13px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-[var(--attio-border)]"
      />
      <span>
        <span className="font-medium text-[var(--attio-text)]">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-[var(--attio-text-tertiary)]">{description}</span>}
      </span>
    </label>
  );
}

export function FormSubmitBar({
  submitLabel = "Save",
  onCancel,
  className,
  form,
}: {
  submitLabel?: string;
  onCancel?: () => void;
  className?: string;
  form?: string;
}) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      {onCancel && (
        <AttioButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </AttioButton>
      )}
      <AttioButton type="submit" variant="primary" form={form}>
        {submitLabel}
      </AttioButton>
    </div>
  );
}
