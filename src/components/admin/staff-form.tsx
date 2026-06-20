"use client";

import { FormCheckbox, FormField, FormGrid, FormModal, FormSection, FormSubmitBar } from "@/components/candela/form";
import type { AdminRole, DepartmentConfig, StaffMember } from "@/design-system/admin-data";
import { HEALTHCARE_STAFF_ROLES } from "@/lib/healthcare-roles";
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

type StaffFormProps = {
  open: boolean;
  onClose: () => void;
  departments: DepartmentConfig[];
  initial?: StaffMember;
  onSave: (data: Omit<StaffMember, "id">, opts?: { createLogin?: boolean; password?: string }) => void;
};

export function StaffFormModal({ open, onClose, departments, initial, onSave }: StaffFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRole>("frontdesk");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [licenseNo, setLicenseNo] = useState("");
  const [onDuty, setOnDuty] = useState(true);
  const [createLogin, setCreateLogin] = useState(true);
  const [password, setPassword] = useState("Welcome2026!");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setRole(initial?.role ?? "frontdesk");
    setDepartmentIds(initial?.departmentIds ?? []);
    setLicenseNo(initial?.licenseNo ?? "");
    setOnDuty(initial?.onDuty ?? true);
    setCreateLogin(!initial);
    setPassword("Welcome2026!");
  }, [open, initial]);

  const toggleDept = (id: string) => {
    setDepartmentIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSave(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || "+91",
        role,
        departmentIds,
        branchId: initial?.branchId ?? "branch_gurgaon",
        licenseNo: licenseNo.trim() || undefined,
        onDuty,
        joinedAt: initial?.joinedAt ?? new Date().toISOString().slice(0, 10),
      },
      initial ? undefined : { createLogin, password },
    );
    onClose();
  };

  return (
    <FormModal open={open} onClose={onClose} title={initial ? "Edit staff member" : "Add staff member"} size="md">
      <form id="staff-form" onSubmit={handleSubmit} className="candela-form space-y-4">
        <FormGrid cols={2}>
          <FormField label="Full name" required span={2}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 00000" />
          </FormField>
          <FormField label="Healthcare role" span={2}>
            <Select value={role} onValueChange={(v) => v && setRole(v as AdminRole)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTHCARE_STAFF_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="License / ID">
            <Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="Optional" />
          </FormField>
        </FormGrid>

        {!initial && (
          <div className="space-y-3 rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] p-3">
            <FormCheckbox label="Create platform login" checked={createLogin} onChange={setCreateLogin} description="Creates a User account for workspace access" />
            {createLogin && (
              <FormField label="Initial password">
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              </FormField>
            )}
          </div>
        )}

        <FormSection title="Departments">
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDept(d.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
                  departmentIds.includes(d.id)
                    ? "border-[var(--attio-text)] bg-[var(--attio-text)] text-white"
                    : "border-[var(--attio-border)] bg-white hover:bg-[var(--attio-surface)]",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </FormSection>

        <FormCheckbox label="On duty now" checked={onDuty} onChange={setOnDuty} />
        <FormSubmitBar form="staff-form" onCancel={onClose} submitLabel={initial ? "Save changes" : "Add staff"} />
      </form>
    </FormModal>
  );
}
