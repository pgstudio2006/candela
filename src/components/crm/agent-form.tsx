"use client";

import { FormCheckbox, FormField, FormGrid, FormModal, FormSection, FormSubmitBar } from "@/components/candela/form";
import type { CrmAgent } from "@/design-system/crm-data";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const SPECIALTY_OPTIONS = ["spine", "knee", "shoulder", "wellness", "general"];

type AgentFormProps = {
  open: boolean;
  onClose: () => void;
  initial?: CrmAgent;
  agents?: CrmAgent[];
  onSave: (data: Omit<CrmAgent, "id">, password?: string) => void;
};

export function CrmAgentFormModal({ open, onClose, initial, agents = [], onSave }: AgentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CrmAgent["role"]>("counsellor");
  const [specialtyTags, setSpecialtyTags] = useState<string[]>([]);
  const [maxOpenLeads, setMaxOpenLeads] = useState(25);
  const [leadWeightPercent, setLeadWeightPercent] = useState(33);
  const [backupAgentId, setBackupAgentId] = useState("");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setRole(initial?.role ?? "counsellor");
    setSpecialtyTags(initial?.specialtyTags ?? []);
    setMaxOpenLeads(initial?.maxOpenLeads ?? 25);
    setLeadWeightPercent(initial?.leadWeightPercent ?? 33);
    setBackupAgentId(initial?.backupAgentId ?? "");
    setActive(initial?.active ?? true);
    setPassword("");
  }, [open, initial]);

  const toggleTag = (tag: string) => {
    setSpecialtyTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSave(
      {
        name: name.trim(),
        email: email.trim(),
        role,
        specialtyTags,
        maxOpenLeads,
        leadWeightPercent,
        backupAgentId: backupAgentId || undefined,
        active,
      },
      password.trim() || undefined,
    );
    onClose();
  };

  return (
    <FormModal open={open} onClose={onClose} title={initial ? "Edit team member" : "Add team member"} size="md">
      <form id="crm-agent-form" onSubmit={handleSubmit} className="candela-form space-y-4">
        <FormGrid cols={2}>
          <FormField label="Full name" required span={2}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Work email" required span={2}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label={initial ? "New password" : "Login password"} span={2} hint={initial ? "Leave blank to keep current" : "Auto-generated if empty"}>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
          </FormField>
          <FormField label="Role">
            <Select value={role} onValueChange={(v) => v && setRole(v as CrmAgent["role"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="counsellor">Counsellor</SelectItem>
                <SelectItem value="caller">Caller / SDR</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Max open leads">
            <Input type="number" value={maxOpenLeads} onChange={(e) => setMaxOpenLeads(Number(e.target.value))} min={1} />
          </FormField>
          <FormField label="Lead weight %">
            <Input type="number" value={leadWeightPercent} onChange={(e) => setLeadWeightPercent(Number(e.target.value))} min={0} max={100} />
          </FormField>
          <FormField label="Backup when absent" span={2}>
            <Select value={backupAgentId || "none"} onValueChange={(v) => setBackupAgentId(!v || v === "none" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select backup agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {agents.filter((a) => a.id !== initial?.id).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>

        <FormSection title="Specialty tags" description="Used for lead routing by specialty">
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[12px] capitalize transition-colors",
                  specialtyTags.includes(tag)
                    ? "border-[var(--attio-text)] bg-[var(--attio-text)] text-white"
                    : "border-[var(--attio-border)] bg-white hover:bg-[var(--attio-surface)]",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </FormSection>

        <FormCheckbox label="Active" description="Receives new lead assignments" checked={active} onChange={setActive} />
        <FormSubmitBar form="crm-agent-form" onCancel={onClose} submitLabel={initial ? "Save" : "Add person"} />
      </form>
    </FormModal>
  );
}
