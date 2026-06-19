"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { updateAdminSettingsAction } from "@/server/admin/settings-actions";
import { useState } from "react";

export default function AdminSettingsPage() {
  const { settings, refresh } = useAdminStore();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(settings);

  const save = async () => {
    setSaving(true);
    try {
      await updateAdminSettingsAction(local);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Settings" }]}
      title="Admin settings"
      meta="Platform configuration · privacy · exports"
      actions={
        <AttioButton variant="primary" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </AttioButton>
      }
    >
      <Panel title="Privacy & data mining">
        <div className="space-y-3 text-[13px]">
          <label className="flex items-center justify-between gap-4">
            <span>k-anonymity minimum (population analytics)</span>
            <input
              type="number"
              min={2}
              className="w-20 rounded border px-2 py-1"
              value={local.kAnonymityMin}
              onChange={(e) => setLocal({ ...local, kAnonymityMin: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.geoAggregateOnly}
              onChange={(e) => setLocal({ ...local, geoAggregateOnly: e.target.checked })}
            />
            Geo map shows aggregate clusters only
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Audit log retention (years)</span>
            <input
              type="number"
              min={1}
              className="w-20 rounded border px-2 py-1"
              value={local.auditRetentionYears}
              onChange={(e) => setLocal({ ...local, auditRetentionYears: Number(e.target.value) })}
            />
          </label>
        </div>
      </Panel>

      <Panel title="Integrations & automation" className="mt-4">
        <div className="space-y-3 text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.outbreakAlerts}
              onChange={(e) => setLocal({ ...local, outbreakAlerts: e.target.checked })}
            />
            Outbreak / surge alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.autoMisDaily}
              onChange={(e) => setLocal({ ...local, autoMisDaily: e.target.checked })}
            />
            Auto-run daily MIS (trigger via /api/cron/notifications)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.whatsappConsentFlag}
              onChange={(e) => setLocal({ ...local, whatsappConsentFlag: e.target.checked })}
            />
            WhatsApp / SMS consent remote sign
          </label>
        </div>
      </Panel>
    </PageChrome>
  );
}
