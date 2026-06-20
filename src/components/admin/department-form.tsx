"use client";

import type { DepartmentConfig, StaffMember } from "@/design-system/admin-data";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--attio-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--attio-border-subtle)] px-4 py-3">
          <h2 className="text-[15px] font-semibold">{initial ? "Edit department" : "Add department"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[var(--attio-hover)]">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Department name *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 text-[13px]" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Department head</Label>
            <Select value={headStaffId || "__none"} onValueChange={(v) => setHeadStaffId(!v || v === "__none" ? "" : v)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Select head…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Treatment bays</Label>
            <Input value={baysText} onChange={(e) => setBaysText(e.target.value)} className="h-9 text-[13px]" placeholder="Bay 1, Bay 2, Procedure Room" />
            <p className="text-[11px] text-[var(--attio-text-tertiary)]">Comma-separated</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Default package IDs</Label>
            <Input value={packagesText} onChange={(e) => setPackagesText(e.target.value)} className="h-9 text-[13px]" placeholder="pkg_basic, pkg_regen" />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active department
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--attio-border-subtle)] pt-4">
            <AttioButton variant="secondary" onClick={onClose}>Cancel</AttioButton>
            <AttioButton variant="primary" type="submit">{initial ? "Save changes" : "Add department"}</AttioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
