"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { exportAuditCsv } from "@/lib/admin-utils";
import { useState } from "react";

export default function AdminAuditPage() {
  const { getAuditLog } = useAdminStore();
  const [filter, setFilter] = useState("all");
  const events = getAuditLog().filter((e) => filter === "all" || e.module === filter);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Audit" }]}
      title="Audit & compliance"
      meta="Immutable event log · accreditation-ready export"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "frontdesk", "doctor", "counsellor", "nurse", "admin"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(m)}
            className={`rounded-full border px-3 py-1 text-[12px] capitalize ${filter === m ? "border-[var(--attio-accent)] bg-blue-50/50" : "border-[var(--attio-border)]"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <Panel
        title={`${events.length} events`}
        action={
          <button
            type="button"
            className="text-[11px] text-[var(--attio-accent)]"
            onClick={() => exportAuditCsv(events)}
          >
            Export CSV
          </button>
        }
      >
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {events.map((e) => (
            <li key={e.id} className="grid gap-1 py-3 sm:grid-cols-[140px_100px_1fr] sm:items-center">
              <span className="text-[11px] tabular-nums text-[var(--attio-text-tertiary)]">{new Date(e.at).toLocaleString("en-IN")}</span>
              <StatusBadge label={e.module} variant="neutral" />
              <div>
                <p className="text-[13px] font-medium">{e.summary}</p>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">{e.action} · {e.actor} · {e.entityType}:{e.entityId}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </PageChrome>
  );
}
