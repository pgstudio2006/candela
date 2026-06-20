"use client";

import type { CrmAgent, CrmAssignmentRule } from "@/design-system/crm-data";
import { AttioButton } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-[15px] font-semibold">{initial ? "Edit routing rule" : "Add routing rule"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[var(--attio-hover)]">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Rule name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 text-[13px]" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Strategy</Label>
            <Select value={strategy} onValueChange={(v) => v && setStrategy(v as CrmAssignmentRule["strategy"])}>
              <SelectTrigger className="h-9 text-[13px]">
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
          </div>
          {strategy === "by_source" && (
            <Input placeholder="Source (whatsapp, google_forms…)" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 text-[13px]" />
          )}
          {strategy === "by_specialty" && (
            <Input placeholder="Specialty (spine, knee…)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-9 text-[13px]" />
          )}
          <div className="space-y-2">
            <Label className="text-[12px]">Agents in pool</Label>
            <div className="flex flex-wrap gap-2">
              {teamAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAgent(a.id)}
                  className={`rounded-md border px-2.5 py-1 text-[12px] ${selectedIds.includes(a.id) ? "border-[var(--attio-text)] bg-[var(--attio-text)] text-white" : "border-[var(--attio-border)]"}`}
                >
                  {a.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          {strategy === "percentage" && selectedIds.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-[12px]">Percentage split (should total 100%)</Label>
              {selectedIds.map((id) => {
                const agent = teamAgents.find((a) => a.id === id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[12px]">{agent?.name.split(" ")[0]}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[id] ?? agent?.leadWeightPercent ?? ""}
                      onChange={(e) => setWeights((w) => ({ ...w, [id]: Number(e.target.value) }))}
                      className="h-8 w-20 text-[13px]"
                    />
                    <span className="text-[12px] text-[var(--attio-text-tertiary)]">%</span>
                  </div>
                );
              })}
              <p className={`text-[11px] ${weightSum === 100 ? "text-emerald-600" : "text-amber-600"}`}>Total: {weightSum}%</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Rule active
          </label>
          <div className="flex justify-end gap-2 border-t pt-4">
            <AttioButton variant="secondary" type="button" onClick={onClose}>
              Cancel
            </AttioButton>
            <AttioButton variant="primary" type="submit">
              Save rule
            </AttioButton>
          </div>
        </form>
      </div>
    </div>
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-xl">
        <h2 className="text-[15px] font-semibold">Mark {agent.name} unavailable</h2>
        <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">
          Open leads can transfer to backup ({agents.find((a) => a.id === agent.backupAgentId)?.name ?? "next available agent"}).
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-[12px]">Unavailable until</Label>
            <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 h-9 text-[13px]" />
          </div>
          <div>
            <Label className="text-[12px]">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 h-9 text-[13px]" />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} />
            Transfer open leads now
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <AttioButton variant="secondary" onClick={onClose}>
            Cancel
          </AttioButton>
          <AttioButton variant="primary" onClick={() => onConfirm(new Date(until).toISOString(), reason, transfer)}>
            Confirm absence
          </AttioButton>
        </div>
      </div>
    </div>
  );
}
