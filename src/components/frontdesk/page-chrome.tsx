"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

export function PageChrome({
  breadcrumbs,
  title,
  meta,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  breadcrumbs: Crumb[];
  title: string;
  meta?: string;
  actions?: ReactNode;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="border-b border-[var(--attio-border-subtle)] px-6 pt-5 pb-0">
        <nav className="mb-3 flex items-center gap-1 text-[12px] text-[var(--attio-text-tertiary)]">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 opacity-50" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-[var(--attio-text-secondary)]">
                  {c.label}
                </Link>
              ) : (
                <span className="text-[var(--attio-text-secondary)]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--attio-text)]">
                {title}
              </h1>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--attio-text-tertiary)] hover:bg-[var(--attio-hover)] hover:text-[var(--attio-text)]"
                aria-label="Favorite"
              >
                <Star className="size-4" />
              </button>
            </div>
            {meta && (
              <p className="mt-1 text-[13px] text-[var(--attio-text-tertiary)]">{meta}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="mt-5 flex gap-0 border-b border-transparent">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-[var(--attio-text)] text-[var(--attio-text)]"
                    : "border-transparent text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text-secondary)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 px-6 py-5">{children}</div>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--attio-text-tertiary)] uppercase">
      {children}
    </p>
  );
}
