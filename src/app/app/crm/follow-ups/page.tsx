"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";

export default function CrmFollowUpsPage() {
  const { followUps, leads, agents, completeFollowUp, addFollowUp, getFilteredLeads, getFilteredFollowUps } = useCrmStore();
  const visibleLeadIds = new Set(getFilteredLeads().map((l) => l.id));
  const items = getFilteredFollowUps().filter((f) => visibleLeadIds.has(f.leadId));

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Follow-ups" }]}
      title="Follow-ups"
      meta="Scheduled calls & WhatsApp · counsellor accountability"
    >
      <Panel title={`${items.filter((f) => f.status === "pending").length} pending`}>
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {items.map((f) => {
            const lead = leads.find((l) => l.id === f.leadId);
            const agent = agents.find((a) => a.id === f.assigneeId);
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
                <div>
                  <p className="font-medium">{lead?.fullName ?? f.leadId}</p>
                  <p className="text-[11px] text-[var(--attio-text-tertiary)]">
                    {agent?.name} · {f.channel} · {new Date(f.scheduledAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={f.status} variant={f.status === "done" ? "success" : f.status === "missed" ? "danger" : "warning"} />
                  {f.status === "pending" && (
                    <AttioButton variant="primary" className="!h-7 !text-[11px]" onClick={() => completeFollowUp(f.id, "Completed")}>
                      Done
                    </AttioButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <AttioButton
        variant="secondary"
        className="mt-4"
        onClick={() => {
          const lead = getFilteredLeads()[0];
          if (!lead?.assigneeId) return;
          addFollowUp({
            leadId: lead.id,
            assigneeId: lead.assigneeId,
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
            channel: "whatsapp",
            status: "pending",
          });
        }}
      >
        Schedule sample follow-up
      </AttioButton>
    </PageChrome>
  );
}
