"use client";

import { StaffFormModal } from "@/components/admin/staff-form";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { StaffMember } from "@/design-system/admin-data";
import { parseActionError } from "@/lib/action-errors";
import { staffRoleLabel } from "@/lib/healthcare-roles";
import {
  createStaffWithLoginAction,
  resetStaffPasswordAction,
} from "@/server/admin/settings-actions";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminStaffPage() {
  const {
    staff,
    departments,
    branchId,
    canManageConfig,
    updateStaff,
    addStaff,
    removeStaff,
    logAdminAction,
    hydrateSnapshot,
  } = useAdminStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | undefined>();
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const showToast = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 10000);
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
        <div
          className={`mb-4 rounded-lg border px-4 py-2 text-[13px] ${
            toast.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.msg}
        </div>
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
            role: staffRoleLabel(s.role),
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
                  <td className="py-2 pr-4 font-medium">{staffRoleLabel(String(role))}</td>
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
        branchId={branchId}
        onSave={async (data, opts) => {
          try {
            if (editing) {
              if (opts?.resetPassword) {
                const result = await resetStaffPasswordAction(editing.id, opts.password || undefined);
                if (!result.ok) {
                  throw new Error(result.error);
                }
                hydrateSnapshot(result.data.snapshot);
                showToast(`Password reset · ${result.data.loginEmail} / ${result.data.initialPassword}`);
              }
              await updateStaff(editing.id, data);
              logAdminAction(`Updated staff: ${data.name}`);
              if (!opts?.resetPassword) {
                showToast(`Updated ${data.name}`);
              }
              return;
            }

            if (opts?.createLogin) {
              const result = await createStaffWithLoginAction({
                staff: data,
                password: opts.password || undefined,
              });
              if (!result.ok) {
                throw new Error(result.error);
              }
              hydrateSnapshot(result.data.snapshot);
              const doctorNote =
                data.role === "doctor" && result.data.doctorId
                  ? ` · Doctor ID ${result.data.doctorId} · sign in at /workspace`
                  : "";
              if (result.data.initialPassword) {
                showToast(`Staff added · login: ${data.email} / ${result.data.initialPassword}${doctorNote}`);
              } else {
                showToast(`Staff added: ${data.name}${doctorNote}`);
              }
              logAdminAction(`Added staff with login: ${data.name}`);
              return;
            }

            await addStaff(data);
            logAdminAction(`Added staff: ${data.name}`);
            showToast(`Staff added: ${data.name}`);
          } catch (err) {
            const message = parseActionError(err).message;
            showToast(message, "err");
            throw err;
          }
        }}
      />
    </PageChrome>
  );
}
