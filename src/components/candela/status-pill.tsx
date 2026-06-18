import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variants = {
  default: "bg-[var(--c-surface-raised)] text-[var(--c-text-secondary)]",
  accent: "bg-[var(--c-accent-muted)] text-[var(--c-accent)]",
  success: "bg-[var(--c-success-muted)] text-[var(--c-success)]",
  warning: "bg-[var(--c-warning-muted)] text-[var(--c-warning)]",
  critical: "bg-[var(--c-critical-muted)] text-[var(--c-critical)]",
  info: "bg-[var(--c-info-muted)] text-[var(--c-info)]",
  neutral: "bg-[var(--c-surface-hover)] text-[var(--c-text-tertiary)]",
} as const;

export function StatusPill({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
