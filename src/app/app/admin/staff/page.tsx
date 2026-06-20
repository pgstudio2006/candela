"use client";

import { StaffFormModal } from "@/components/admin/staff-form";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { StaffMember } from "@/design-system/admin-data";
import { createStaffWithLoginAction } from "@/server/admin/settings-actions";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminStaffPage() {
  const { staff, departments, branchId, canManageConfig, updateStaff, addStaff, removeStaff, logAdminAction, refresh } = useAdminStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 8000);
  };

  if (!canManageConfig) {
    return (
      <PageChrome breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Staff" }]} title="Staff & access" meta="Configuration access required">
        <p className="text-[13px]">Staff management requires configuration access.</p>
      </PageChrome>
    );
  }

  const deptLabel = (ids: string[]) =>
    ids.map((id) => departments.find((d) => d.id === id)?.label ?? id).join(", ") || "—";

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Staff" }]}
      title="Staff & access"
      meta="RBAC · departments · duty status"
      actions={
        <AttioButton
          variant="primary"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          Add staff
        </AttioButton>
      }
    >
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-800">{toast}</div>
      )}
      <Panel title={`${staff.length} staff members`}>
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "dept", label: "Departments" },
            { key: "duty", label: "On duty" },
            { key: "actions", label: "", className: "w-24" },
          ]}
          rows={staff.map((s) => ({
            name: (
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">{s.email}</p>
              </div>
            ),
            role: s.role.replace("_", " "),
            dept: deptLabel(s.departmentIds),
            duty: (
              <button type="button" onClick={() => updateStaff(s.id, { onDuty: !s.onDuty })}>
                <StatusBadge label={s.onDuty ? "On duty" : "Off"} variant={s.onDuty ? "success" : "neutral"} />
              </button>
            ),
            actions: (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded p-1 hover:bg-[var(--attio-hover)]"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(s);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                  aria-label="Remove"
                  onClick={() => {
                    if (confirm(`Remove ${s.name} from staff?`)) {
                      removeStaff(s.id);
                      logAdminAction(`Removed staff: ${s.name}`);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ),
          }))}
        />
      </Panel>

      <Panel title="Role permissions" className="mt-4">
        <p className="mb-3 text-[12px] text-[var(--attio-text-secondary)]">
          Permissions are enforced server-side. Super admin and branch admin can manage configuration; finance roles can access billing modules; viewers have read-only command center access.
        </p>
        <div className="overflow-x-auto text-[12px]">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-[var(--attio-text-tertiary)]">
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 px-2">Billing</th>
                <th className="py-2 px-2">Discount approve</th>
                <th className="py-2 px-2">Consent verify</th>
                <th className="py-2 px-2">Admin config</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["super_admin", "✓", "✓", "✓", "✓"],
                ["branch_admin", "✓", "✓", "✓", "—"],
                ["finance", "✓", "—", "—", "—"],
                ["mrd", "—", "—", "—", "MRD only"],
                ["viewer", "read", "read", "read", "read"],
              ].map(([role, ...perms]) => (
                <tr key={role} className="border-b border-[var(--attio-border-subtle)]">
                  <td className="py-2 pr-4 font-medium capitalize">{String(role).replace("_", " ")}</td>
                  {perms.map((p, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      {p}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <StaffFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        departments={departments}
        initial={editing}
        onSave={async (data, opts) => {
          if (editing) {
            await updateStaff(editing.id, data);
            logAdminAction(`Updated staff: ${data.name}`);
          } else if (opts?.createLogin) {
            const result = await createStaffWithLoginAction({
              staff: data,
              password: opts.password || undefined,
            });
            await refresh();
            if (result.initialPassword) {
              showToast(`Staff onboarded · login: ${data.email} / ${result.initialPassword}`);
            }
            logAdminAction(`Added staff with login: ${data.name}`);
          } else {
            await addStaff(data);
            logAdminAction(`Added staff: ${data.name}`);
          }
        }}
        branchId={branchId}
      />
    </PageChrome>
  );
}
