"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { useSession } from "@/components/candela/session-provider";
import { cn } from "@/lib/utils";

/** Subtle signed-in banner — identity comes from login credentials, not a picker */
export function CrmOperatorBanner() {
  const { session } = useSession();
  const { getOperator, isManager } = useCrmStore();
  const operator = getOperator();
  const name = operator?.name ?? session?.userName ?? "CRM User";
  const manager = isManager();

  return (
    <div
      className={cn(
        "border-b px-6 py-2 text-[12px]",
        manager
          ? "border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] text-[var(--attio-text-secondary)]"
          : "border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 text-blue-950",
      )}
    >
      <span className="font-medium">{manager ? "CRM Manager" : name}</span>
      <span className="mx-2 text-[var(--attio-text-tertiary)]">·</span>
      <span className={manager ? "" : "text-blue-800/80"}>
        {session?.userEmail ?? operator?.email}
      </span>
      {!manager && (
        <span className="ml-2 hidden text-blue-700/75 sm:inline">— your leads & follow-ups only</span>
      )}
    </div>
  );
}
