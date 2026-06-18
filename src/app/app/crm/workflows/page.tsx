"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const PRESET_COLORS = ["#6366f1", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#dc2626", "#71717a"];

export default function CrmWorkflowsPage() {
  const { stages, updateStage, addStage, removeStage, reorderStage, isManager } = useCrmStore();
  const [newLabel, setNewLabel] = useState("");

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Workflows" }]} title="Workflows" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Your manager defines pipeline stages. You move leads through them in Pipeline view.</p>
      </PageChrome>
    );
  }

  const ordered = [...stages].sort((a, b) => a.order - b.order);

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Workflows" }]}
      title="Customizable workflows"
      meta="Rename steps · reorder · add/remove stages · set SLA"
    >
      <Panel title="Pipeline stages">
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {ordered.map((s) => (
            <li key={s.id} className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_100px_80px_auto] sm:items-center">
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateStage(s.id, { color: e.target.value })}
                className="size-8 cursor-pointer rounded border-0 bg-transparent"
                title="Stage color"
              />
              <Input
                value={s.label}
                onChange={(e) => updateStage(s.id, { label: e.target.value })}
                className="h-9 text-[13px] font-medium"
                placeholder="Stage name"
              />
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[var(--attio-text-tertiary)]">SLA</span>
                <Input
                  type="number"
                  min={0}
                  value={s.slaHours ?? ""}
                  onChange={(e) =>
                    updateStage(s.id, { slaHours: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="h-8 w-16 text-[12px]"
                  placeholder="h"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="size-4 rounded-full ring-1 ring-black/10"
                    style={{ background: c }}
                    onClick={() => updateStage(s.id, { color: c })}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <AttioButton variant="ghost" className="!h-7 !px-2" onClick={() => reorderStage(s.id, -1)}>
                  ↑
                </AttioButton>
                <AttioButton variant="ghost" className="!h-7 !px-2" onClick={() => reorderStage(s.id, 1)}>
                  ↓
                </AttioButton>
                {ordered.length > 2 && (
                  <AttioButton variant="ghost" className="!h-7 !px-2 text-red-600" onClick={() => removeStage(s.id)}>
                    ✕
                  </AttioButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Add stage" className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New stage name e.g. Insurance pending"
            className="h-9 max-w-sm flex-1 text-[13px]"
          />
          <AttioButton
            variant="primary"
            onClick={() => {
              if (!newLabel.trim()) return;
              addStage(newLabel.trim());
              setNewLabel("");
            }}
          >
            Add stage
          </AttioButton>
        </div>
        <p className="mt-3 text-[12px] text-[var(--attio-text-secondary)]">
          Changes apply immediately to the Pipeline board. Counsellors see updated step names in their personal workspace.
        </p>
      </Panel>
    </PageChrome>
  );
}
