"use client";

import { FormCheckbox, FormField, FormModal, FormSubmitBar } from "@/components/candela/form";
import type { DepartmentConfig, StaffMember } from "@/design-system/admin-data";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

type DepartmentFormProps = {
  open: boolean;
  onClose: () => void;
  staff: StaffMember[];
  initial?: DepartmentConfig;
  onSave: (data: Omit<DepartmentConfig, "id">) => void;
};

export function DepartmentFormModal({ open, onClose, staff, initial, onSave }: DepartmentFormProps) {
  const [label, setLabel] = useState("");
  const [headStaffId, setHeadStaffId] = useState<string>("");
  const [baysText, setBaysText] = useState("");
  const [packagesText, setPackagesText] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setHeadStaffId(initial?.headStaffId ?? "");
    setBaysText(initial?.bays.join(", ") ?? "");
    setPackagesText(initial?.defaultPackageIds.join(", ") ?? "");
    setActive(initial?.active ?? true);
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      headStaffId: headStaffId || undefined,
      doctorIds: initial?.doctorIds ?? [],
      defaultPackageIds: packagesText.split(",").map((s) => s.trim()).filter(Boolean),
      revenuePolicyId: initial?.revenuePolicyId,
      bays: baysText.split(",").map((s) => s.trim()).filter(Boolean),
      active,
    });
    onClose();
  };

  return (
    <FormModal open={open} onClose={onClose} title={initial ? "Edit department" : "Add department"} size="md">
      <form id="dept-form" onSubmit={handleSubmit} className="candela-form space-y-4">
        <FormField label="Department name" required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </FormField>
        <FormField label="Department head">
          <Select value={headStaffId || "__none"} onValueChange={(v) => setHeadStaffId(!v || v === "__none" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select head…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Treatment bays" hint="Comma-separated">
          <Input value={baysText} onChange={(e) => setBaysText(e.target.value)} placeholder="Bay 1, Bay 2, Procedure Room" />
        </FormField>
        <FormField label="Default package IDs" hint="Comma-separated">
          <Input value={packagesText} onChange={(e) => setPackagesText(e.target.value)} placeholder="pkg_basic, pkg_regen" />
        </FormField>
        <FormCheckbox label="Active department" checked={active} onChange={setActive} />
        <FormSubmitBar form="dept-form" onCancel={onClose} submitLabel={initial ? "Save changes" : "Add department"} />
      </form>
    </FormModal>
  );
}
