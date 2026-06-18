"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { PrescriptionEditor } from "@/components/doctor/prescription-editor";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import type { DoctorTemplate, PrescriptionLine } from "@/design-system/doctor-data";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const EMPTY: Omit<DoctorTemplate, "id" | "doctorId"> = {
  label: "",
  disease: "",
  diagnosis: { primaryDiagnosis: "", clinicalImpression: "", severity: "moderate" },
  treatment: { plan: "", followUp: "2 weeks", procedures: "None" },
  prescription: [],
};

type TemplateFormProps = {
  initial?: DoctorTemplate;
  onSave: (data: Omit<DoctorTemplate, "id" | "doctorId">) => void;
  onCancel: () => void;
};

function TemplateForm({ initial, onSave, onCancel }: TemplateFormProps) {
  const [form, setForm] = useState<Omit<DoctorTemplate, "id" | "doctorId">>(
    initial
      ? {
          label: initial.label,
          disease: initial.disease,
          diagnosis: { ...initial.diagnosis },
          treatment: { ...initial.treatment },
          prescription: initial.prescription.map((p) => ({ ...p })),
        }
      : { ...EMPTY, prescription: [] },
  );

  const setDx = (key: string, val: string) =>
    setForm((f) => ({ ...f, diagnosis: { ...f.diagnosis, [key]: val } }));
  const setTx = (key: string, val: string) =>
    setForm((f) => ({ ...f, treatment: { ...f.treatment, [key]: val } }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px]">
          <span className="mb-1 block text-[var(--attio-text-tertiary)]">Template name</span>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
            placeholder="e.g. Lumbar radiculopathy — conservative"
          />
        </label>
        <label className="block text-[12px]">
          <span className="mb-1 block text-[var(--attio-text-tertiary)]">Disease category</span>
          <input
            value={form.disease}
            onChange={(e) => setForm((f) => ({ ...f, disease: e.target.value }))}
            className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
            placeholder="e.g. Lumbar disc disease"
          />
        </label>
      </div>

      <Panel title="Diagnosis defaults">
        <div className="grid gap-3">
          <input
            value={String(form.diagnosis.primaryDiagnosis ?? "")}
            onChange={(e) => setDx("primaryDiagnosis", e.target.value)}
            placeholder="Primary diagnosis"
            className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
          />
          <input
            value={String(form.diagnosis.clinicalImpression ?? "")}
            onChange={(e) => setDx("clinicalImpression", e.target.value)}
            placeholder="Clinical impression"
            className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
          />
        </div>
      </Panel>

      <Panel title="Treatment defaults">
        <div className="grid gap-3">
          <textarea
            value={String(form.treatment.plan ?? "")}
            onChange={(e) => setTx("plan", e.target.value)}
            placeholder="Treatment plan"
            rows={3}
            className="w-full resize-none rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={String(form.treatment.followUp ?? "")}
              onChange={(e) => setTx("followUp", e.target.value)}
              placeholder="Follow-up"
              className="rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
            />
            <input
              value={String(form.treatment.procedures ?? "")}
              onChange={(e) => setTx("procedures", e.target.value)}
              placeholder="Procedures"
              className="rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
            />
          </div>
        </div>
      </Panel>

      <Panel title="Default prescription">
        <PrescriptionEditor
          lines={form.prescription}
          onChange={(lines: PrescriptionLine[]) => setForm((f) => ({ ...f, prescription: lines }))}
        />
      </Panel>

      <div className="flex gap-2">
        <AttioButton
          variant="primary"
          disabled={!form.label.trim()}
          onClick={() => onSave(form)}
        >
          Save template
        </AttioButton>
        <AttioButton variant="secondary" onClick={onCancel}>
          Cancel
        </AttioButton>
      </div>
    </div>
  );
}

export default function DoctorTemplatesPage() {
  const { templates, createDoctorTemplate, updateDoctorTemplate, deleteDoctorTemplate } =
    useDoctorStore();
  const [editing, setEditing] = useState<DoctorTemplate | "new" | null>(null);

  const custom = templates.filter((t) => t.id.startsWith("tpl_custom_"));
  const system = templates.filter((t) => !t.id.startsWith("tpl_custom_"));

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Doctor", href: "/app/doctor" },
        { label: "My templates" },
      ]}
      title="Disease & treatment templates"
      meta="Doctor-specific templates · apply during consultation"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus className="size-3.5" />
          New template
        </AttioButton>
      }
    >
      {editing && (
        <Panel title={editing === "new" ? "Create template" : "Edit template"} className="mb-6">
          <TemplateForm
            initial={editing === "new" ? undefined : editing}
            onSave={(data) => {
              if (editing === "new") createDoctorTemplate(data);
              else updateDoctorTemplate(editing.id, data);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Your templates"
          action={<span className="text-[11px] text-[var(--attio-text-tertiary)]">{custom.length} custom</span>}
        >
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {custom.length === 0 && (
              <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                No custom templates — create one for your common diagnoses
              </li>
            )}
            {custom.map((tpl) => (
              <li key={tpl.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-[13px] font-medium">{tpl.label}</p>
                  <p className="text-[11px] text-[var(--attio-text-tertiary)]">{tpl.disease}</p>
                  <p className="mt-1 text-[11px] text-[var(--attio-text-secondary)]">
                    {tpl.prescription.length} medicines · {String(tpl.diagnosis.primaryDiagnosis ?? "").slice(0, 40)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <AttioButton variant="secondary" className="h-7 text-[11px]" onClick={() => setEditing(tpl)}>
                    Edit
                  </AttioButton>
                  <button
                    type="button"
                    onClick={() => deleteDoctorTemplate(tpl.id)}
                    className="rounded p-1.5 text-[var(--attio-text-tertiary)] hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="System templates">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {system.map((tpl) => (
              <li key={tpl.id} className="py-3">
                <p className="text-[13px] font-medium">{tpl.label}</p>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">{tpl.disease}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--attio-text-tertiary)]">
            Duplicate a system template by creating a new one with similar fields.
          </p>
        </Panel>
      </div>
    </PageChrome>
  );
}
