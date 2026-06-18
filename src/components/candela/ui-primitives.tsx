import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--c-radius-xl)] border border-[var(--c-border)] bg-[var(--c-surface)]",
        hover && "transition-colors hover:bg-[var(--c-surface-hover)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[var(--c-text-2xl)] font-semibold tracking-tight text-[var(--c-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[var(--c-text-sm)] text-[var(--c-text-tertiary)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--c-text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--c-text)]">
        {value}
      </p>
      {delta && (
        <p className="mt-1 text-[11px] text-[var(--c-text-tertiary)]">{delta}</p>
      )}
    </Card>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--c-radius-md)] bg-[var(--c-accent)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--c-accent-hover)] disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--c-radius-md)] border border-[var(--c-border)] bg-transparent px-3 text-[12px] font-medium text-[var(--c-text-secondary)] transition-colors hover:bg-[var(--c-surface-hover)] hover:text-[var(--c-text)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
