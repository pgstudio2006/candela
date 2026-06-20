"use client";

import { listHrAuditLogsAction } from "@/server/hr/actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useHrStore } from "@/components/hr/hr-store";
import { useHrPoll } from "@/hooks/use-hr-poll";
import { useCallback, useEffect, useState } from "react";

type AuditRow = Awaited<ReturnType<typeof listHrAuditLogsAction>>[number];

export default function HrAuditPage() {
  useHrPoll(30_000);
  const { isManager } = useHrStore();
  const [platformLogs, setPlatformLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listHrAuditLogsAction({ limit: 80 });
    setPlatformLogs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Audit" }]} title="Audit trail" meta="Manager only">
        <p className="text-[13px]">Full audit trail available to HR managers.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Audit" }]}
      title="HR audit log"
      meta="Platform audit · staff · leave · attendance · payroll · CRM sync"
      actions={
        <AttioButton variant="secondary" onClick={() => void load()}>
          Refresh
        </AttioButton>
      }
    >
      <Panel title="Platform audit (immutable)">
        {loading && platformLogs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">Loading…</p>
        ) : platformLogs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No platform audit entries yet</p>
        ) : (
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {platformLogs.map((log) => (
              <li key={log.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium">{log.summary}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--attio-text-tertiary)]">
                      {log.actor} · {log.action} · {log.entityType} {log.entityId}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      label={log.severity}
                      variant={log.severity === "critical" || log.severity === "warning" ? "warning" : "neutral"}
                    />
                    <p className="mt-1 text-[10px] text-[var(--attio-text-tertiary)]">
                      {new Date(log.at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageChrome>
  );
}
