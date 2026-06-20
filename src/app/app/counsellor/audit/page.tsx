"use client";

import { listCounsellorAuditLogsAction } from "@/server/counsellor/actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";
import { useCallback, useEffect, useState } from "react";

type AuditRow = Awaited<ReturnType<typeof listCounsellorAuditLogsAction>>[number];

export default function CounsellorAuditPage() {
  useCounsellorPoll(30_000);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listCounsellorAuditLogsAction({ limit: 80 });
    setLogs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Audit log" }]}
      title="Counsellor audit log"
      meta="Sessions · conversions · discount approvals · billing handoffs"
      actions={
        <AttioButton variant="secondary" onClick={() => void load()}>
          Refresh
        </AttioButton>
      }
    >
      <Panel title="Recent activity">
        {loading && logs.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">No audit entries yet</p>
        ) : (
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {logs.map((log) => (
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
