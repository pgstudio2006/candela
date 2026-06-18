"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { Copy, MessageCircle, FileSpreadsheet, Globe, Zap } from "lucide-react";

const ICONS = {
  whatsapp: MessageCircle,
  form: FileSpreadsheet,
  meta: Globe,
  globe: Globe,
  zap: Zap,
};

export default function CrmIntegrationsPage() {
  const { integrations, toggleIntegration, ingestFromIntegration, isManager } = useCrmStore();

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Integrations" }]} title="Integrations" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Integration setup is managed by your CRM manager.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Integrations" }]}
      title="Integrations"
      meta="WhatsApp · Google Forms · Meta · Website · Zapier — leads flow into your workspace automatically"
    >
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-900">
        Connect third-party sources via webhook URL. In production, paste these URLs into WhatsApp Business API, Google Apps Script, or Meta Lead Ads.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((int) => {
          const Icon = ICONS[int.icon];
          return (
            <Panel
              key={int.id}
              title={int.label}
              action={
                <button
                  type="button"
                  onClick={() => toggleIntegration(int.id, !int.connected)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    int.connected ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {int.connected ? "Connected" : "Disconnected"}
                </button>
              }
            >
              <div className="flex gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--attio-surface)]">
                  <Icon className="size-5 text-[var(--attio-text-secondary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[var(--attio-text-secondary)]">{int.description}</p>
                  <div className="mt-2 flex items-center gap-1 rounded-md bg-[var(--attio-surface)] px-2 py-1 font-mono text-[10px] text-[var(--attio-text-tertiary)]">
                    <span className="truncate">{int.webhookUrl}</span>
                    <button type="button" onClick={() => navigator.clipboard.writeText(int.webhookUrl)} className="shrink-0 p-1 hover:text-[var(--attio-text)]">
                      <Copy className="size-3" />
                    </button>
                  </div>
                  {int.lastEventAt && (
                    <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">
                      Last event: {new Date(int.lastEventAt).toLocaleString("en-IN")} · {int.leadsToday} leads today
                    </p>
                  )}
                </div>
              </div>
              {int.connected && (
                <AttioButton
                  variant="secondary"
                  className="mt-3 !text-[12px]"
                  onClick={() =>
                    ingestFromIntegration(int.id, {
                      name: `Test from ${int.label}`,
                      phone: "+91 98765 " + Math.floor(10000 + Math.random() * 89999),
                      specialty: "spine",
                      notes: "Test webhook payload",
                    })
                  }
                >
                  Simulate inbound lead
                </AttioButton>
              )}
            </Panel>
          );
        })}
      </div>
    </PageChrome>
  );
}
