"use client";

import type { CandelaModule } from "@/design-system/modules";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ModuleViewNav({ module }: { module: CandelaModule }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("view") ?? module.views[0]?.id;

  if (module.views.length <= 1) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-[var(--c-border)] pb-3">
      {module.views.map((v) => (
        <Link
          key={v.id}
          href={`${module.path}?view=${v.id}`}
          className={cn(
            "rounded-[var(--c-radius-md)] px-3 py-1.5 text-[12px] font-medium transition-colors",
            active === v.id
              ? "bg-[var(--c-accent-muted)] text-[var(--c-accent)]"
              : "text-[var(--c-text-tertiary)] hover:bg-[var(--c-surface-hover)] hover:text-[var(--c-text)]",
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

export function useModuleView(module: CandelaModule) {
  const searchParams = useSearchParams();
  return searchParams.get("view") ?? module.views[0]?.id ?? "";
}
