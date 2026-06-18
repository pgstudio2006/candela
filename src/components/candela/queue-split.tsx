"use client";

import { StatusPill } from "@/components/candela/status-pill";
import { Card } from "@/components/candela/ui-primitives";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function QueueSplit({
  listTitle,
  items,
  selectedId,
  onSelect,
  renderItem,
  detail,
}: {
  listTitle: string;
  items: { id: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  renderItem: (item: { id: string }, selected: boolean) => ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="grid h-[calc(100vh-var(--c-shell-top)-120px)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b border-[var(--c-border)] px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--c-text-tertiary)]">
            {listTitle}
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto p-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-[var(--c-radius-md)] px-2 py-2 text-left transition-colors",
                  selectedId === item.id
                    ? "bg-[var(--c-accent-muted)]"
                    : "hover:bg-[var(--c-surface-hover)]",
                )}
              >
                {renderItem(item, selectedId === item.id)}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <div className="min-h-0 overflow-auto">{detail}</div>
    </div>
  );
}

export function BillingBadge({ status }: { status: "paid" | "deferred" | "pending" }) {
  const map = {
    paid: { label: "Paid", variant: "success" as const },
    deferred: { label: "Deferred", variant: "warning" as const },
    pending: { label: "Pending", variant: "neutral" as const },
  };
  const m = map[status];
  return <StatusPill variant={m.variant}>{m.label}</StatusPill>;
}
