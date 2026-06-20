"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, MetricStrip, StatusBadge } from "@/components/frontdesk/ui";
import { hrPeriodYm } from "@/design-system/hr-data";
import { useMemo, useState } from "react";

export default function HrPayrollPage() {
  const { payroll, employees, processPayroll, markPayrollPaid, generatePayrollRun, isManager } = useHrStore();
  const [period, setPeriod] = useState(hrPeriodYm(0));
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const periodLines = useMemo(() => payroll.filter((p) => p.period === period), [payroll, period]);
  const totals = useMemo(() => {
    const net = periodLines.reduce((s, p) => s + p.net, 0);
    const draft = periodLines.filter((p) => p.status === "draft").length;
    const processed = periodLines.filter((p) => p.status === "processed").length;
    return { net, draft, processed, count: periodLines.length };
  }, [periodLines]);

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Payroll" }]} title="Payroll" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Payroll is visible to HR managers only.</p>
      </PageChrome>
    );
  }

  const hasDraft = periodLines.some((p) => p.status === "draft");
  const hasProcessed = periodLines.some((p) => p.status === "processed");

  return (
    <PageChrome
      breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Payroll" }]}
      title="Payroll"
      meta="Monthly runs · basic + allowances − deductions"
      actions={
        <div className="flex gap-2">
          <AttioButton
            variant="secondary"
            onClick={async () => {
              const n = await generatePayrollRun(period);
              if (n) showToast(`Generated ${n} payroll line(s) for ${period}`);
              else showToast(`All employees already have payroll for ${period}`);
            }}
          >
            Generate run
          </AttioButton>
          {hasDraft && (
            <AttioButton variant="primary" onClick={async () => processPayroll(period)}>
              Process {period}
            </AttioButton>
          )}
          {hasProcessed && (
            <AttioButton variant="primary" onClick={async () => markPayrollPaid(period)}>
              Mark paid
            </AttioButton>
          )}
        </div>
      }
    >
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-800">{toast}</div>
      )}
      <div className="mb-4">
        <select className="h-9 rounded-md border px-2 text-[13px]" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {[0, -1, -2].map((o) => {
            const p = hrPeriodYm(o);
            return <option key={p} value={p}>{p}</option>;
          })}
        </select>
      </div>
      <MetricStrip metrics={[
        { label: "Employees", value: String(totals.count), delta: period, trend: "neutral" },
        { label: "Total net", value: `₹${totals.net.toLocaleString("en-IN")}`, delta: "This period", trend: "neutral" },
        { label: "Draft", value: String(totals.draft), delta: "Awaiting process", trend: totals.draft ? "down" : "neutral" },
        { label: "Processed", value: String(totals.processed), delta: "Ready to pay", trend: "neutral" },
      ]} />
      <DataTable
        columns={[
          { key: "employee", label: "Employee" },
          { key: "period", label: "Period" },
          { key: "basic", label: "Basic" },
          { key: "allow", label: "Allowances" },
          { key: "ded", label: "Deductions" },
          { key: "net", label: "Net" },
          { key: "status", label: "Status" },
        ]}
        rows={periodLines.map((p) => ({
          employee: employees.find((e) => e.id === p.employeeId)?.name ?? p.employeeId,
          period: p.period,
          basic: `₹${p.basic.toLocaleString("en-IN")}`,
          allow: `₹${p.allowances.toLocaleString("en-IN")}`,
          ded: `₹${p.deductions.toLocaleString("en-IN")}`,
          net: `₹${p.net.toLocaleString("en-IN")}`,
          status: <StatusBadge label={p.status} variant={p.status === "paid" ? "success" : p.status === "processed" ? "info" : "neutral"} />,
        }))}
      />
    </PageChrome>
  );
}
