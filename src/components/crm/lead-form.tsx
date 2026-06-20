"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { AttioButton } from "@/components/frontdesk/ui";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[12px] text-[var(--attio-text-secondary)]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (initial) {
        await updateLead(initial.id, { ...payload, assigneeId: assigneeId || initial.assigneeId });
        onSaved?.(initial.id);
      } else {
        await addLead({ ...payload, assigneeId, sourceDetail: "Manual capture" });
        onSaved?.("");
      }
      onClose();
    } catch {
      setError("Could not save lead. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl border border-[var(--attio-border)] bg-white shadow-2xl sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold">{initial ? "Edit lead" : "Add lead"}</h2>
            <p className="text-[12px] text-[var(--attio-text-tertiary)]">
              {initial ? "Update patient & appointment details" : "Capture full patient details before adding to pipeline"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--attio-hover)]">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

          <section className="mb-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--attio-text-tertiary)]">
              Status & assignment
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Status">
                <Select value={form.stageId} onValueChange={(v) => v && set("stageId", v)}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderedStages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Assignee name">
                {isManager() ? (
                  <Select value={form.assigneeId} onValueChange={(v) => set("assigneeId", v ?? "")}>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue placeholder="Select counsellor" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={operator?.name ?? ""} readOnly className="h-9 bg-[var(--attio-surface)] text-[13px]" />
                )}
              </Field>
              <Field label="Assignee email">
                <Input
                  value={
                    isManager()
                      ? teamAgents.find((a) => a.id === form.assigneeId)?.email ?? ""
                      : operator?.email ?? ""
                  }
                  readOnly
                  className="h-9 bg-[var(--attio-surface)] text-[13px]"
                />
              </Field>
              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => v && set("source", v as CrmLeadSource)}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOURCE_LABELS) as CrmLeadSource[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SOURCE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {isLostStage && (
              <Field label="Lost reason" required className="mt-3">
                <Input
                  value={form.lostReason}
                  onChange={(e) => set("lostReason", e.target.value)}
                  placeholder="Why was this lead lost?"
                  className="h-9 text-[13px]"
                />
              </Field>
            )}
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--attio-text-tertiary)]">
              Patient details
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name" required>
                <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="h-9 text-[13px]" required />
              </Field>
              <Field label="Phone" required>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" className="h-9 text-[13px]" required />
              </Field>
              <Field label="Alternate number">
                <Input value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Age">
                <Input type="number" min={0} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => set("gender", (v ?? "") as CrmLeadFormValues["gender"])}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--attio-text-tertiary)]">
              Location
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="District name">
                <Input value={form.district} onChange={(e) => set("district", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="State & UT">
                <Select value={form.state} onValueChange={(v) => set("state", v ?? "")}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} className="h-9 text-[13px]" />
              </Field>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--attio-text-tertiary)]">
              Clinical & appointment
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Doctor name">
                <Input value={form.doctorName} onChange={(e) => set("doctorName", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Specialty">
                <Input value={form.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder="spine, knee…" className="h-9 text-[13px]" />
              </Field>
              <Field label="Est. value (₹)">
                <Input type="number" min={0} value={form.valueEstimate} onChange={(e) => set("valueEstimate", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Appointment date">
                <Input type="date" value={form.appointmentDate} onChange={(e) => set("appointmentDate", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Appointment time">
                <Input type="time" value={form.appointmentTime} onChange={(e) => set("appointmentTime", e.target.value)} className="h-9 text-[13px]" />
              </Field>
              <Field label="Appointment centre">
                <Select value={form.appointmentCentre} onValueChange={(v) => set("appointmentCentre", v ?? "")}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_APPOINTMENT_CENTRES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="mb-2">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--attio-accent)]/20"
                placeholder="Chief complaint, referral context, follow-up instructions…"
              />
            </Field>
          </section>
        </form>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
          <AttioButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </AttioButton>
          <AttioButton variant="primary" type="submit" onClick={handleSubmit}>
            {initial ? "Save changes" : "Add to pipeline"}
          </AttioButton>
        </div>
      </div>
    </div>
  );
}
