"use client";

import { DepartmentFormModal } from "@/components/admin/department-form";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { DepartmentConfig } from "@/design-system/admin-data";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminDepartmentsPage() {
  const { departments, staff, updateDepartment, addDepartment, removeDepartment, logAdminAction } = useAdminStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentConfig | undefined>();

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Departments" }]}
      title="Departments"
      meta="Org structure · bays · default packages · revenue policies"
      actions={
        <AttioButton
          variant="primary"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          Add department
        </AttioButton>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((d) => {
          const head = staff.find((s) => s.id === d.headStaffId);
          const memberCount = staff.filter((s) => s.departmentIds.includes(d.id)).length;
          return (
            <Panel
              key={d.id}
              title={d.label}
              action={
                <div className="flex items-center gap-2">
                  <StatusBadge label={d.active ? "Active" : "Inactive"} variant={d.active ? "success" : "neutral"} />
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-[var(--attio-hover)]"
                    onClick={() => {
                      setEditing(d);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Remove department "${d.label}"?`)) {
                        removeDepartment(d.id);
                        logAdminAction(`Removed department: ${d.label}`);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              }
            >
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-[var(--attio-text-tertiary)]">Head</dt>
                  <dd>{head?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--attio-text-tertiary)]">Staff assigned</dt>
                  <dd>{memberCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--attio-text-tertiary)]">Doctors</dt>
                  <dd>{d.doctorIds.length}</dd>
                </div>
                <div>
                  <dt className="text-[var(--attio-text-tertiary)]">Default packages</dt>
                  <dd className="mt-1">{d.defaultPackageIds.join(" · ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--attio-text-tertiary)]">Treatment bays</dt>
                  <dd className="mt-1">{d.bays.join(" · ") || "—"}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="mt-3 text-[12px] text-[var(--attio-accent)] hover:underline"
                onClick={() => updateDepartment(d.id, { active: !d.active })}
              >
                Toggle active
              </button>
            </Panel>
          );
        })}
      </div>

      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        staff={staff}
        initial={editing}
        onSave={(data) => {
          if (editing) {
            updateDepartment(editing.id, data);
            logAdminAction(`Updated department: ${data.label}`);
          } else {
            addDepartment(data);
            logAdminAction(`Added department: ${data.label}`);
          }
        }}
      />
    </PageChrome>
  );
}
