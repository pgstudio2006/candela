"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { exportAuditCsv } from "@/lib/admin-utils";
import { listAdminAuditLogsAction } from "@/server/admin/actions";
import { useCallback, useEffect, useState } from "react";

type PlatformRow = Awaited<ReturnType<typeof listAdminAuditLogsAction>>[number];

export default function AdminAuditPage() {
  const { getAuditLog } = useAdminStore();
  const [filter, setFilter] = useState("all");
  const [platformLogs, setPlatformLogs] = useState<PlatformRow[]>([]);
  const events = getAuditLog().filter((e) => filter === "all" || e.module === filter);

  const loadPlatform = useCallback(async () => {
    const rows = await listAdminAuditLogsAction({ limit: 60 });
    setPlatformLogs(rows);
  }, []);

  useEffect(() => {
    void loadPlatform();
  }, [loadPlatform]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Audit" }]}
      title="Audit & compliance"
      meta="Admin audit log · platform audit trail"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "admin", "finance", "mrd", "mis", "rcm", "forms", "frontdesk", "doctor"].map((m) => (
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
        title={`${events.length} admin events`}
        action={
          <button type="button" className="text-[11px] text-[var(--attio-accent)]" onClick={() => exportAuditCsv(events)}>
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
      <Panel
        title="Platform audit (tenant immutable)"
        className="mt-4"
        action={
          <AttioButton variant="secondary" className="!h-8 !text-[11px]" onClick={() => void loadPlatform()}>
            Refresh
          </AttioButton>
        }
      >
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {platformLogs.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No platform audit entries yet</li>
          ) : (
            platformLogs.map((log) => (
              <li key={log.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium">{log.summary}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--attio-text-tertiary)]">
                      {log.actor} · {log.action} · {log.entityType} {log.entityId}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge label={log.severity} variant={log.severity === "warning" ? "warning" : "neutral"} />
                    <p className="mt-1 text-[10px] text-[var(--attio-text-tertiary)]">
                      {new Date(log.at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </Panel>
    </PageChrome>
  );
}
