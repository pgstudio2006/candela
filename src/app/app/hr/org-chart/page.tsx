"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { buildOrgTree, getDepartmentName } from "@/lib/hr-platform";
import type { OrgNode } from "@/lib/hr-platform";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

function OrgBranch({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <li className="relative">
      <div
        className="flex items-start gap-2 rounded-lg border bg-white p-3 text-[13px] shadow-sm"
        style={{ marginLeft: depth * 16 }}
      >
        {hasChildren ? (
          <button type="button" className="mt-0.5 shrink-0" onClick={() => setOpen(!open)}>
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{node.employee.name}</p>
            <StatusBadge label={node.employee.role} variant={node.employee.role === "executive" ? "info" : "neutral"} />
            {!node.employee.active && <StatusBadge label="Inactive" variant="danger" />}
          </div>
          <p className="text-[12px] text-[var(--attio-text-tertiary)]">{node.employee.designation}</p>
          {node.employee.crmAgentId && <p className="mt-1 text-[11px] text-blue-600">CRM linked</p>}
        </div>
      </div>
      {hasChildren && open && (
        <ul className="mt-2 space-y-2 border-l border-dashed border-[var(--attio-border)] pl-3">
          {node.children.map((c) => (
            <OrgBranch key={c.employee.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function HrOrgChartPage() {
  const { employees, departments } = useHrStore();
  const tree = buildOrgTree(employees, "hr_mgr");
  const manager = employees.find((e) => e.id === "hr_mgr");

  return (
    <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Org chart" }]} title="Organization chart" meta="Reporting lines · departments · CRM links">
      {manager && (
        <div className="mb-4 rounded-xl border-2 border-[var(--attio-accent)] bg-[var(--attio-active)] p-4 text-center">
          <p className="text-[11px] uppercase tracking-wide text-[var(--attio-text-tertiary)]">Head of HR</p>
          <p className="text-[16px] font-semibold">{manager.name}</p>
          <p className="text-[12px] text-[var(--attio-text-tertiary)]">{manager.designation}</p>
        </div>
      )}
      <Panel title="Reporting hierarchy">
        <ul className="space-y-3">
          {tree.map((n) => (
            <OrgBranch key={n.employee.id} node={n} />
          ))}
        </ul>
      </Panel>
      <Panel title="Departments" className="mt-4">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => {
            const head = employees.find((e) => e.id === d.headId);
            const count = employees.filter((e) => e.departmentId === d.id && e.active).length;
            return (
              <li key={d.id} className="rounded-lg border p-4 text-[13px]">
                <p className="font-medium">{d.name}</p>
                <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">Head: {head?.name ?? "—"}</p>
                <p className="mt-2 text-[20px] font-semibold">{count}</p>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">active staff</p>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Department roster" className="mt-4">
        <div className="space-y-4">
          {departments.map((d) => (
            <div key={d.id}>
              <p className="mb-2 text-[12px] font-semibold">{getDepartmentName(departments, d.id)}</p>
              <div className="flex flex-wrap gap-2">
                {employees.filter((e) => e.departmentId === d.id && e.active).map((e) => (
                  <span key={e.id} className="rounded-full border px-2.5 py-1 text-[12px]">{e.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </PageChrome>
  );
}
