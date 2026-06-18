"use client";

import { EmployeeFormModal } from "@/components/hr/forms";
import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { type HrEmployee } from "@/design-system/hr-data";
import { computeLeaveBalance, getDepartmentName } from "@/lib/hr-platform";
import { Pencil, Plus, Search, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function HrStaffPage() {
  const { employees, departments, leaveRequests, addEmployee, updateEmployee, isManager } = useHrStore();
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState<HrEmployee | null>(null);
  const [detail, setDetail] = useState<HrEmployee | null>(null);
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const filtered = useMemo(() => {
    return employees
      .filter((e) => e.role !== "manager")
      .filter((e) => deptFilter === "all" || e.departmentId === deptFilter)
      .filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.email.toLowerCase().includes(q.toLowerCase()));
  }, [employees, q, deptFilter]);

  return (
    <PageChrome
      breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Staff" }]}
      title="Staff directory"
      meta={`${filtered.length} employees · departments · CRM linkage`}
      actions={isManager() ? <AttioButton variant="primary" onClick={() => { setEditEmp(null); setShowForm(true); }}><Plus className="size-3.5" /> Add employee</AttioButton> : undefined}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--attio-text-tertiary)]" />
          <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-8 text-[13px]" />
        </div>
        <select className="h-9 rounded-md border px-2 text-[13px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "dept", label: "Department" },
          { key: "role", label: "Designation" },
          { key: "salary", label: "Salary" },
          { key: "crm", label: "CRM" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={filtered.map((e) => ({
          name: <button type="button" className="font-medium text-left hover:underline" onClick={() => setDetail(e)}>{e.name}</button>,
          email: e.email,
          dept: getDepartmentName(departments, e.departmentId),
          role: e.designation,
          salary: `₹${e.salaryMonthly.toLocaleString("en-IN")}`,
          crm: e.crmAgentId ? <StatusBadge label="Linked" variant="info" /> : "—",
          status: <StatusBadge label={e.active ? "Active" : "Inactive"} variant={e.active ? "success" : "neutral"} />,
          actions: isManager() ? (
            <div className="flex gap-1">
              <AttioButton variant="secondary" className="!h-7 !px-2" onClick={() => { setEditEmp(e); setShowForm(true); }}><Pencil className="size-3" /></AttioButton>
              <AttioButton variant="secondary" className="!h-7 !px-2" onClick={() => updateEmployee(e.id, { active: !e.active })}><UserX className="size-3" /></AttioButton>
            </div>
          ) : null,
        }))}
      />
      {showForm && (
        <EmployeeFormModal
          departments={departments}
          employees={employees}
          initial={editEmp ?? undefined}
          onClose={() => { setShowForm(false); setEditEmp(null); }}
          onSave={(data) => {
            if (editEmp) updateEmployee(editEmp.id, data);
            else addEmployee(data as Omit<HrEmployee, "id">);
          }}
        />
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setDetail(null)}>
          <Panel title={detail.name} className="h-full w-full max-w-md overflow-y-auto rounded-none border-l" action={<button type="button" onClick={() => setDetail(null)} className="text-[11px]">Close</button>}>
            <dl className="space-y-3 text-[13px]">
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Email</dt><dd>{detail.email}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Phone</dt><dd>{detail.phone || "—"}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Department</dt><dd>{getDepartmentName(departments, detail.departmentId)}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Designation</dt><dd>{detail.designation}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Manager</dt><dd>{employees.find((e) => e.id === detail.managerId)?.name ?? "—"}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Joined</dt><dd>{detail.joinDate}</dd></div>
              <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">Monthly salary</dt><dd>₹{detail.salaryMonthly.toLocaleString("en-IN")}</dd></div>
              {detail.crmAgentId && <div><dt className="text-[11px] text-[var(--attio-text-tertiary)]">CRM agent</dt><dd><StatusBadge label="Linked" variant="info" /></dd></div>}
            </dl>
            <div className="mt-4 rounded-lg border p-3">
              <p className="text-[12px] font-medium">Leave balance</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
                {(["casual", "sick", "earned"] as const).map((t) => {
                  const bal = computeLeaveBalance(detail.id, leaveRequests);
                  return (
                    <div key={t} className="rounded bg-[var(--attio-surface)] p-2 text-center">
                      <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">{t}</p>
                      <p className="font-semibold">{bal[t]}d</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </PageChrome>
  );
}
