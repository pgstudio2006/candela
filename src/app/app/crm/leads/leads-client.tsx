"use client";

import { CrmLeadFormModal } from "@/components/crm/lead-form";
import { LeadDetailPanel, LeadPipelineBoard } from "@/components/crm/lead-detail";
import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton } from "@/components/frontdesk/ui";
import type { CrmLead } from "@/design-system/crm-data";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CrmLeadsPageClient() {
  const searchParams = useSearchParams();
  const { getFilteredLeads, stages, agents, moveLeadStage, assignLeadManual, activities, followUps } = useCrmStore();
  const leads = getFilteredLeads();
  const [selected, setSelected] = useState<CrmLead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmLead | undefined>();

  useEffect(() => {
    if (searchParams.get("new") === "1") setFormOpen(true);
  }, [searchParams]);

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Pipeline" }]}
      title="Lead pipeline"
      meta="Add leads with full patient details · move through customizable stages"
      actions={
        <AttioButton variant="primary" onClick={openAdd}>
          <Plus className="size-3.5" />
          Add lead
        </AttioButton>
      }
    >
      <LeadPipelineBoard
        leads={leads}
        stages={stages}
        agents={agents}
        onSelect={setSelected}
        onMoveStage={moveLeadStage}
      />
      {selected && (
        <LeadDetailPanel
          lead={leads.find((l) => l.id === selected.id) ?? selected}
          agent={agents.find((a) => a.id === selected.assigneeId)}
          stageLabel={stages.find((s) => s.id === selected.stageId)?.label ?? selected.stageId}
          onClose={() => setSelected(null)}
          onAssign={(agentId) => {
            assignLeadManual(selected.id, agentId);
            setSelected(null);
          }}
          onEdit={() => {
            setEditing(selected);
            setFormOpen(true);
          }}
          agents={agents.filter((a) => a.role !== "manager")}
          activities={activities}
          followUps={followUps}
        />
      )}
      <CrmLeadFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        initial={editing}
        onSaved={() => setSelected(null)}
      />
    </PageChrome>
  );
}
