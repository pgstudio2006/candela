"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { FormField, FormGrid, FormModal, FormSection, FormSubmitBar } from "@/components/candela/form";
import {
  CRM_APPOINTMENT_CENTRES,
  CRM_INDIAN_STATES,
  EMPTY_LEAD_FORM,
  SOURCE_LABELS,
  type CrmLead,
  type CrmLeadFormValues,
  type CrmLeadSource,
} from "@/design-system/crm-data";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

function leadToForm(lead: CrmLead): CrmLeadFormValues {
  return {
    fullName: lead.fullName,
    phone: lead.phone,
    alternatePhone: lead.alternatePhone ?? "",
    email: lead.email ?? "",
    age: lead.age != null ? String(lead.age) : "",
    gender: lead.gender ?? "",
    city: lead.city ?? "",
    district: lead.district ?? "",
    state: lead.state ?? "",
    country: lead.country ?? "India",
    doctorName: lead.doctorName ?? "",
    appointmentDate: lead.appointmentDate ?? "",
    appointmentTime: lead.appointmentTime ?? "",
    appointmentCentre: lead.appointmentCentre ?? "",
    source: lead.source,
    stageId: lead.stageId,
    assigneeId: lead.assigneeId ?? "",
    specialty: lead.specialty ?? "",
    valueEstimate: lead.valueEstimate ? String(lead.valueEstimate) : "",
    priority: lead.priority,
    notes: lead.notes ?? "",
    lostReason: lead.lostReason ?? "",
  };
}

function formToLeadPayload(form: CrmLeadFormValues) {
  return {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    alternatePhone: form.alternatePhone.trim() || undefined,
    email: form.email.trim() || undefined,
    age: form.age ? Number(form.age) : undefined,
    gender: form.gender || undefined,
    city: form.city.trim() || undefined,
    district: form.district.trim() || undefined,
    state: form.state.trim() || undefined,
    country: form.country.trim() || undefined,
    doctorName: form.doctorName.trim() || undefined,
    appointmentDate: form.appointmentDate || undefined,
    appointmentTime: form.appointmentTime || undefined,
    appointmentCentre: form.appointmentCentre || undefined,
    source: form.source,
    stageId: form.stageId,
    assigneeId: form.assigneeId || undefined,
    specialty: form.specialty.trim() || undefined,
    valueEstimate: form.valueEstimate ? Number(form.valueEstimate) : 50000,
    priority: form.priority,
    notes: form.notes.trim(),
    tags: [] as string[],
    lostReason: form.lostReason.trim() || undefined,
  };
}

type CrmLeadFormModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: CrmLead;
  onSaved?: (leadId: string) => void;
};

export function CrmLeadFormModal({ open, onClose, initial, onSaved }: CrmLeadFormModalProps) {
  const { stages, agents, isManager, operatorId, addLead, updateLead } = useCrmStore();
  const [form, setForm] = useState<CrmLeadFormValues>(EMPTY_LEAD_FORM);
  const [error, setError] = useState("");

  const orderedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages]);
  const teamAgents = agents.filter((a) => a.role !== "manager" && a.active);
  const operator = agents.find((a) => a.id === operatorId);
  const isLostStage = form.stageId === "lost" || orderedStages.find((s) => s.id === form.stageId)?.label.toLowerCase() === "lost";

  useEffect(() => {
    if (!open) return;
    const manager = isManager();
    if (initial) {
      setForm(leadToForm(initial));
    } else {
      const firstStage = orderedStages[0]?.id ?? "new";
      setForm({
        ...EMPTY_LEAD_FORM,
        stageId: firstStage,
        assigneeId: manager ? "" : operatorId,
        appointmentCentre: CRM_APPOINTMENT_CENTRES[0] ?? "",
      });
    }
    setError("");
  }, [open, initial?.id, operatorId, orderedStages[0]?.id]);

  if (!open) return null;

  const set = <K extends keyof CrmLeadFormValues>(key: K, value: CrmLeadFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    if (isLostStage && !form.lostReason.trim()) {
      setError("Lost reason is required when status is Lost.");
      return;
    }

    const payload = formToLeadPayload(form);
    const assigneeId = isManager() ? payload.assigneeId : operatorId;

    if (initial) {
      updateLead(initial.id, { ...payload, assigneeId: assigneeId || initial.assigneeId });
      onSaved?.(initial.id);
    } else {
      addLead({ ...payload, assigneeId, sourceDetail: "Manual capture" });
      onSaved?.("");
    }
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={initial ? "Edit lead" : "Add lead"}
      description={initial ? "Update patient & appointment details" : "Capture full patient details before adding to pipeline"}
      size="xl"
      footer={
        <FormSubmitBar
          form="crm-lead-form"
          onCancel={onClose}
          submitLabel={initial ? "Save changes" : "Add to pipeline"}
        />
      }
    >
      <form id="crm-lead-form" onSubmit={handleSubmit} className="candela-form space-y-[var(--cf-section-gap,1.5rem)]">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

        <FormSection title="Status & assignment">
          <FormGrid cols={4}>
            <FormField label="Status">
              <Select value={form.stageId} onValueChange={(v) => v && set("stageId", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orderedStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Assignee name">
              {isManager() ? (
                <Select value={form.assigneeId} onValueChange={(v) => set("assigneeId", v ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select counsellor" /></SelectTrigger>
                  <SelectContent>
                    {teamAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={operator?.name ?? ""} readOnly className="bg-[var(--attio-surface)]" />
              )}
            </FormField>
            <FormField label="Assignee email">
              <Input
                value={isManager() ? teamAgents.find((a) => a.id === form.assigneeId)?.email ?? "" : operator?.email ?? ""}
                readOnly
                className="bg-[var(--attio-surface)]"
              />
            </FormField>
            <FormField label="Source">
              <Select value={form.source} onValueChange={(v) => v && set("source", v as CrmLeadSource)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOURCE_LABELS) as CrmLeadSource[]).map((key) => (
                    <SelectItem key={key} value={key}>{SOURCE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
          {isLostStage && (
            <FormField label="Lost reason" required className="mt-3">
              <Input value={form.lostReason} onChange={(e) => set("lostReason", e.target.value)} placeholder="Why was this lead lost?" />
            </FormField>
          )}
        </FormSection>

        <FormSection title="Patient details">
          <FormGrid cols={3}>
            <FormField label="Name" required>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
            </FormField>
            <FormField label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" required />
            </FormField>
            <FormField label="Alternate number">
              <Input value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </FormField>
            <FormField label="Age">
              <Input type="number" min={0} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} />
            </FormField>
            <FormField label="Gender">
              <Select value={form.gender} onValueChange={(v) => set("gender", (v ?? "") as CrmLeadFormValues["gender"])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Location">
          <FormGrid cols={4}>
            <FormField label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </FormField>
            <FormField label="District name">
              <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
            </FormField>
            <FormField label="State & UT">
              <Select value={form.state} onValueChange={(v) => set("state", v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {CRM_INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Country">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Clinical & appointment">
          <FormGrid cols={3}>
            <FormField label="Doctor name">
              <Input value={form.doctorName} onChange={(e) => set("doctorName", e.target.value)} />
            </FormField>
            <FormField label="Specialty">
              <Input value={form.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder="spine, knee…" />
            </FormField>
            <FormField label="Est. value (₹)">
              <Input type="number" min={0} value={form.valueEstimate} onChange={(e) => set("valueEstimate", e.target.value)} />
            </FormField>
            <FormField label="Appointment date">
              <Input type="date" value={form.appointmentDate} onChange={(e) => set("appointmentDate", e.target.value)} />
            </FormField>
            <FormField label="Appointment time">
              <Input type="time" value={form.appointmentTime} onChange={(e) => set("appointmentTime", e.target.value)} />
            </FormField>
            <FormField label="Appointment centre">
              <Select value={form.appointmentCentre} onValueChange={(v) => set("appointmentCentre", v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select centre" /></SelectTrigger>
                <SelectContent>
                  {CRM_APPOINTMENT_CENTRES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormField label="Notes" span={2}>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Chief complaint, referral context, follow-up instructions…"
          />
        </FormField>
      </form>
    </FormModal>
  );
}
