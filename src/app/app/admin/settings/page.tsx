"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const { settings, updateSettings, canManageConfig } = useAdminStore();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  if (!canManageConfig) {
    return (
      <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Settings" }]} title="Admin settings" meta="Configuration access required">
        <p className="text-[13px]">Settings are managed by admin configuration roles.</p>
      </PageChrome>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(local);
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
      <Panel title="Alerts & automation" className="mt-4">
        <div className="space-y-3 text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.outbreakAlerts}
              onChange={(e) => setLocal({ ...local, outbreakAlerts: e.target.checked })}
            />
            Disease outbreak alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.autoMisDaily}
              onChange={(e) => setLocal({ ...local, autoMisDaily: e.target.checked })}
            />
            Auto-run daily MIS (via cron)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.whatsappConsentFlag}
              onChange={(e) => setLocal({ ...local, whatsappConsentFlag: e.target.checked })}
            />
            Require WhatsApp consent flag on outreach
          </label>
        </div>
      </Panel>
    </PageChrome>
  );
}
