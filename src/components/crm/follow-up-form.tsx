"use client";

import { FormField, FormGrid, FormModal, FormSubmitBar } from "@/components/candela/form";
import type { CrmAgent, CrmFollowUp, CrmLead } from "@/design-system/crm-data";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";

function defaultScheduleLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function FollowUpScheduleModal({
  open,
  onClose,
  leads,
  agents,
  defaultLeadId,
  defaultAssigneeId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  leads: CrmLead[];
  agents: CrmAgent[];
  defaultLeadId?: string;
  defaultAssigneeId?: string;
  onSave: (fu: Omit<CrmFollowUp, "id" | "status">) => void;
}) {
  const openLeads = useMemo(
    () => leads.filter((l) => !["won", "lost"].includes(l.stageId)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [leads],
  );
  const assignableAgents = useMemo(() => agents.filter((a) => a.active && a.role !== "manager"), [agents]);

  const [leadId, setLeadId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [channel, setChannel] = useState<CrmFollowUp["channel"]>("call");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleLocal());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const lead = defaultLeadId ? openLeads.find((l) => l.id === defaultLeadId) : openLeads[0];
    setLeadId(lead?.id ?? "");
    setAssigneeId(defaultAssigneeId ?? lead?.assigneeId ?? assignableAgents[0]?.id ?? "");
    setChannel("call");
    setScheduledAt(defaultScheduleLocal());
    setNotes("");
  }, [open, defaultLeadId, defaultAssigneeId, openLeads, assignableAgents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !assigneeId || !scheduledAt) return;
    onSave({
      leadId,
      assigneeId,
      channel,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <FormModal open={open} onClose={onClose} title="Schedule follow-up" description="Set the next touchpoint for this lead" size="sm">
      <form id="follow-up-schedule-form" onSubmit={handleSubmit} className="candela-form space-y-4">
        <FormField label="Lead" htmlFor="fu-lead">
          <Select value={leadId} onValueChange={(v) => v && setLeadId(v)}>
            <SelectTrigger id="fu-lead" className="w-full">
              <SelectValue placeholder="Select lead" />
            </SelectTrigger>
            <SelectContent>
              {openLeads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.fullName} · {l.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {openLeads.length === 0 && (
            <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">No open leads — add a lead first.</p>
          )}
        </FormField>

        <FormField label="Assignee" htmlFor="fu-assignee">
          <Select value={assigneeId} onValueChange={(v) => v && setAssigneeId(v)}>
            <SelectTrigger id="fu-assignee" className="w-full">
              <SelectValue placeholder="Team member" />
            </SelectTrigger>
            <SelectContent>
              {assignableAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Channel" htmlFor="fu-channel">
            <Select value={channel} onValueChange={(v) => v && setChannel(v as CrmFollowUp["channel"])}>
              <SelectTrigger id="fu-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="When" htmlFor="fu-when">
            <Input id="fu-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          </FormField>
        </FormGrid>

        <FormField label="Notes" htmlFor="fu-notes" hint="Optional — what to cover on this touchpoint">
          <Input id="fu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Package details, callback reason…" />
        </FormField>

        <FormSubmitBar form="follow-up-schedule-form" onCancel={onClose} submitLabel="Schedule" />
      </form>
    </FormModal>
  );
}

export function FollowUpCompleteModal({
  open,
  onClose,
  leadName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  leadName: string;
  onSave: (outcome: string) => void;
}) {
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    if (open) setOutcome("");
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome.trim()) return;
    onSave(outcome.trim());
    onClose();
  };

  return (
    <FormModal open={open} onClose={onClose} title="Mark follow-up done" size="sm">
      <form id="follow-up-complete-form" onSubmit={handleSubmit} className="candela-form space-y-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">{leadName}</p>
        <FormField label="Outcome" htmlFor="fu-outcome" required>
          <Input
            id="fu-outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Patient agreed to visit, needs callback, etc."
            required
            autoFocus
          />
        </FormField>
        <FormSubmitBar form="follow-up-complete-form" onCancel={onClose} submitLabel="Save" />
      </form>
    </FormModal>
  );
}
