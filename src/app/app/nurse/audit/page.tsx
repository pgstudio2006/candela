"use client";

import { listNurseAuditLogsAction } from "@/app/actions/nurse-actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useNursePoll } from "@/hooks/use-nurse-poll";
import { useCallback, useEffect, useState } from "react";

type AuditRow = Awaited<ReturnType<typeof listNurseAuditLogsAction>>[number];

export default function NurseAuditPage() {
  useNursePoll(30_000);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listNurseAuditLogsAction({ limit: 80 });
    setLogs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Audit log" }]}
      title="Nursing audit log"
      meta="Vitals · consent · treatment sessions · episode completion"
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
