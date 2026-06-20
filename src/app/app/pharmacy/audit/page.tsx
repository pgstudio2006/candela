"use client";

import { listPharmacyAuditLogsAction } from "@/server/pharmacy/actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { usePharmacyPoll } from "@/hooks/use-pharmacy-poll";
import { useCallback, useEffect, useState } from "react";

type AuditRow = Awaited<ReturnType<typeof listPharmacyAuditLogsAction>>[number];

export default function PharmacyAuditPage() {
  usePharmacyPoll(30_000);
  const { activities, isManager } = usePharmacyStore();
  const [platformLogs, setPlatformLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listPharmacyAuditLogsAction({ limit: 80 });
    setPlatformLogs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Audit" }]} title="Audit trail" meta="Manager only">
        <p className="text-[13px]">Full audit trail available to pharmacy manager.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Audit" }]}
      title="Pharmacy audit log"
      meta="Platform audit · verify · dispense · stock · procurement"
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
            <li className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">Activity appears on verify, dispense, PO receive</li>
          )}
        </ul>
      </Panel>
    </PageChrome>
  );
}
