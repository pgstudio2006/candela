"use client";

import type { AdminRole, DepartmentConfig, StaffMember } from "@/design-system/admin-data";
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
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "branch_admin", label: "Branch admin" },
  { value: "finance", label: "Finance" },
  { value: "mrd", label: "MRD officer" },
  { value: "viewer", label: "Viewer" },
];

type StaffFormProps = {
  open: boolean;
  onClose: () => void;
  departments: DepartmentConfig[];
  initial?: StaffMember;
  onSave: (data: Omit<StaffMember, "id">) => void;
};

export function StaffFormModal({ open, onClose, departments, initial, onSave }: StaffFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRole>("viewer");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [licenseNo, setLicenseNo] = useState("");
  const [onDuty, setOnDuty] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setRole(initial?.role ?? "viewer");
    setDepartmentIds(initial?.departmentIds ?? []);
    setLicenseNo(initial?.licenseNo ?? "");
    setOnDuty(initial?.onDuty ?? true);
  }, [open, initial]);

  if (!open) return null;

  const toggleDept = (id: string) => {
    setDepartmentIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || "+91",
      role,
      departmentIds,
      branchId: initial?.branchId ?? "branch_gurgaon",
      licenseNo: licenseNo.trim() || undefined,
      onDuty,
      joinedAt: initial?.joinedAt ?? new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--attio-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--attio-border-subtle)] px-4 py-3">
          <h2 className="text-[15px] font-semibold">{initial ? "Edit staff member" : "Add staff member"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[var(--attio-hover)]">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[12px]">Full name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-[13px]" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-[13px]" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-[13px]" placeholder="+91 98765 00000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as AdminRole)}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">License / ID</Label>
              <Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} className="h-9 text-[13px]" placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[12px]">Departments</Label>
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDept(d.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                    departmentIds.includes(d.id)
                      ? "border-[var(--attio-text)] bg-[var(--attio-text)] text-white"
                      : "border-[var(--attio-border)] hover:bg-[var(--attio-surface)]",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={onDuty} onChange={(e) => setOnDuty(e.target.checked)} />
            On duty now
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--attio-border-subtle)] pt-4">
            <AttioButton variant="secondary" onClick={onClose}>Cancel</AttioButton>
            <AttioButton variant="primary" type="submit">{initial ? "Save changes" : "Add staff"}</AttioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
