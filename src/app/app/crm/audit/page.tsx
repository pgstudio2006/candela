"use client";

import { listCrmAuditLogsAction } from "@/server/crm/actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useCrmStore } from "@/components/crm/crm-store";
import { useCrmPoll } from "@/hooks/use-crm-poll";
import { useCallback, useEffect, useState } from "react";

type AuditRow = Awaited<ReturnType<typeof listCrmAuditLogsAction>>[number];

export default function CrmAuditPage() {
  useCrmPoll(30_000);
  const { activities, isManager } = useCrmStore();
  const [platformLogs, setPlatformLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listCrmAuditLogsAction({ limit: 80 });
    setPlatformLogs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Audit" }]} title="Audit trail" meta="Manager only">
        <p className="text-[13px]">Full audit trail available to CRM manager.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Audit" }]}
      title="CRM audit log"
      meta="Platform audit · leads · routing · follow-ups · integrations"
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

      <Panel title="Workspace activity (recent)" className="mt-4">
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {activities.slice(0, 40).map((a) => (
            <li key={a.id} className="py-2 text-[12px]">
              <p>{a.summary}</p>
              <p className="text-[var(--attio-text-tertiary)]">
                {a.actor} · {a.type} · {new Date(a.at).toLocaleString("en-IN")}
              </p>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">Activity appears on lead changes, follow-ups, and routing</li>
          )}
        </ul>
      </Panel>
    </PageChrome>
  );
}
