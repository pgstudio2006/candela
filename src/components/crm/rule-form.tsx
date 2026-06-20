"use client";

import {
  FormActions,
  FormBody,
  FormCheckbox,
  FormField,
  FormGrid,
  FormModal,
  FormSection,
} from "@/components/candela/form";
import type { CrmAgent, CrmAssignmentRule } from "@/design-system/crm-data";
import { AttioButton } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";

const STRATEGIES: CrmAssignmentRule["strategy"][] = [
  "percentage",
  "round_robin",
  "by_source",
  "by_specialty",
  "manual",
];

export function CrmRuleFormModal({
  open,
  onClose,
  initial,
  agents,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: CrmAssignmentRule;
  agents: CrmAgent[];
  onSave: (rule: Omit<CrmAssignmentRule, "id">) => void;
}) {
  const [label, setLabel] = useState("");
  const [strategy, setStrategy] = useState<CrmAssignmentRule["strategy"]>("percentage");
  const [active, setActive] = useState(true);
  const [source, setSource] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});

  const teamAgentIds = useMemo(
    () => agents.filter((a) => a.role !== "manager").map((a) => a.id),
    [agents],
  );
  const teamAgents = useMemo(
    () => agents.filter((a) => a.role !== "manager"),
    [agents],
  );

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setStrategy(initial?.strategy ?? "percentage");
    setActive(initial?.active ?? true);
    setSource(initial?.source ?? "");
    setSpecialty(initial?.specialty ?? "");
    setSelectedIds(initial?.assignToAgentIds ?? teamAgentIds);
    setWeights(initial?.agentWeights ?? {});
  }, [open, initial?.id, teamAgentIds.join(",")]);

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const weightSum = selectedIds.reduce((s, id) => s + (weights[id] ?? 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !selectedIds.length) return;
    const agentWeights: Record<string, number> = {};
    if (strategy === "percentage") {
      for (const id of selectedIds) {
        agentWeights[id] = weights[id] ?? Math.floor(100 / selectedIds.length);
      }
    }
    onSave({
      label: label.trim(),
      active,
      strategy,
      source: strategy === "by_source" && source ? (source as CrmAssignmentRule["source"]) : undefined,
      specialty: strategy === "by_specialty" ? specialty : undefined,
      assignToAgentIds: selectedIds,
      agentWeights: strategy === "percentage" ? agentWeights : undefined,
    });
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={initial ? "Edit routing rule" : "Add routing rule"}
      description="Define how inbound leads are distributed across your team."
      size="lg"
    >
      <FormBody onSubmit={handleSubmit}>
        <FormSection title="Rule">
          <FormGrid cols={2}>
            <FormField label="Rule name" htmlFor="rule-label" required span={2}>
              <Input id="rule-label" value={label} onChange={(e) => setLabel(e.target.value)} required />
            </FormField>
            <FormField label="Strategy" htmlFor="rule-strategy" span={2}>
              <Select value={strategy} onValueChange={(v) => v && setStrategy(v as CrmAssignmentRule["strategy"])}>
                <SelectTrigger id="rule-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {strategy === "by_source" && (
              <FormField label="Source filter" htmlFor="rule-source" span={2} hint="e.g. whatsapp, google_forms">
                <Input id="rule-source" placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
              </FormField>
            )}
            {strategy === "by_specialty" && (
              <FormField label="Specialty filter" htmlFor="rule-specialty" span={2} hint="e.g. spine, knee">
                <Input id="rule-specialty" placeholder="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        <FormSection title="Agent pool">
          <div className="flex flex-wrap gap-2">
            {teamAgents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAgent(a.id)}
                className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  selectedIds.includes(a.id)
                    ? "border-[var(--attio-text)] bg-[var(--attio-text)] text-white"
                    : "border-[var(--attio-border)] bg-white hover:bg-[var(--attio-surface)]"
                }`}
              >
                {a.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </FormSection>

        {strategy === "percentage" && selectedIds.length > 0 && (
          <FormSection title="Percentage split" description="Should total 100%">
            <div className="space-y-2 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] p-3">
              {selectedIds.map((id) => {
                const agent = teamAgents.find((a) => a.id === id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[12px] font-medium">{agent?.name.split(" ")[0]}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[id] ?? agent?.leadWeightPercent ?? ""}
                      onChange={(e) => setWeights((w) => ({ ...w, [id]: Number(e.target.value) }))}
                      className="w-20"
                    />
                    <span className="text-[12px] text-[var(--attio-text-tertiary)]">%</span>
                  </div>
                );
              })}
              <p className={`text-[11px] font-medium ${weightSum === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                Total: {weightSum}%
              </p>
            </div>
          </FormSection>
        )}

        <FormCheckbox label="Rule active" checked={active} onChange={setActive} description="Inactive rules are skipped during lead assignment." />

        <FormActions onCancel={onClose} submitLabel="Save rule" />
      </FormBody>
    </FormModal>
  );
}

export function CrmAbsenceModal({
  open,
  onClose,
  agent,
  agents,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  agent: CrmAgent;
  agents: CrmAgent[];
  onConfirm: (until: string, reason: string, transfer: boolean) => void;
}) {
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("Leave / not available");
  const [transfer, setTransfer] = useState(true);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setUntil(d.toISOString().slice(0, 16));
    setReason("Leave / not available");
    setTransfer(true);
  }, [open, agent.id]);

  const backupName = agents.find((a) => a.id === agent.backupAgentId)?.name ?? "next available agent";

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Mark ${agent.name} unavailable`}
      description={`Open leads can transfer to backup (${backupName}).`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <AttioButton variant="secondary" onClick={onClose}>
            Cancel
          </AttioButton>
          <AttioButton
            variant="primary"
            onClick={() => onConfirm(new Date(until).toISOString(), reason, transfer)}
            disabled={!until}
          >
            Confirm absence
          </AttioButton>
        </div>
      }
    >
      <div className="candela-form space-y-4">
        <FormField label="Unavailable until" htmlFor="absence-until" required>
          <Input id="absence-until" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} required />
        </FormField>
        <FormField label="Reason" htmlFor="absence-reason">
          <Input id="absence-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <FormCheckbox
          label="Transfer open leads now"
          checked={transfer}
          onChange={setTransfer}
          description="Reassigns active leads to the backup agent immediately."
        />
      </div>
    </FormModal>
  );
}
