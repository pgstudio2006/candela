"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { buildShiftHandoverReport } from "@/lib/shift-handover";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function ShiftHandoverPage() {
  const { visits, patients, appointments, refresh } = useFrontdeskStore();

  const report = useMemo(
    () => buildShiftHandoverReport(visits, patients, appointments),
    [visits, patients, appointments],
  );

  const printReport = () => window.print();

  const downloadCsv = () => {
    const rows = [
      ["Shift handover", report.shiftDate],
      ["Generated", report.generatedAt],
      [],
      ["Metric", "Value"],
      ["Arrivals", report.summary.arrivals],
      ["Checked in", report.summary.checkedIn],
      ["Billed (paid/deferred)", report.summary.billedPaid],
      ["In queue", report.summary.inQueue],
      ["With doctor", report.summary.withDoctor],
      ["Red flags", report.summary.redFlags],
      ["Cancelled appointments", report.summary.cancelledAppointments],
      ["Revenue collected", report.summary.revenueCollected],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift-handover-${report.shiftDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Shift handover" },
      ]}
      title="Shift handover report"
      meta={`Live snapshot · ${new Date(report.generatedAt).toLocaleString("en-IN")}`}
      actions={
        <>
          <AttioButton variant="secondary" className="gap-1.5" onClick={() => void refresh()}>
            Refresh
          </AttioButton>
          <AttioButton variant="secondary" className="gap-1.5" onClick={downloadCsv}>
            <Download className="size-3.5" />
            Export CSV
          </AttioButton>
          <AttioButton variant="primary" className="gap-1.5 print:hidden" onClick={printReport}>
            <Printer className="size-3.5" />
            Print
          </AttioButton>
        </>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Arrivals", value: report.summary.arrivals },
          { label: "In queue", value: report.summary.inQueue },
          { label: "With doctor", value: report.summary.withDoctor },
          {
            label: "Revenue",
            value: `₹${report.summary.revenueCollected.toLocaleString("en-IN")}`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-[var(--attio-border-subtle)] bg-white p-4"
          >
            <p className="text-[11px] text-[var(--attio-text-tertiary)]">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Queue by doctor">
          <ul className="space-y-2">
            {report.queueByDoctor.length === 0 && (
              <li className="text-[13px] text-[var(--attio-text-tertiary)]">All queues clear</li>
            )}
            {report.queueByDoctor.map((q) => (
              <li
                key={q.doctorName}
                className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] px-3 py-2 text-[13px]"
              >
                <span className="font-medium">{q.doctorName}</span>
                <span className="text-[var(--attio-text-tertiary)]">
                  {q.waiting} waiting · next #{q.nextToken ?? "—"} · max {q.longestWaitMin}m
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Pending billing">
          <ul className="space-y-2">
            {report.pendingBilling.length === 0 && (
              <li className="text-[13px] text-[var(--attio-text-tertiary)]">None pending</li>
            )}
            {report.pendingBilling.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] px-3 py-2 text-[13px] hover:bg-[var(--attio-surface)]"
                >
                  <span>{b.patientName}</span>
                  <StatusBadge label={b.stage} variant="warning" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Red flag escalations">
          <ul className="space-y-2">
            {report.redFlagVisits.length === 0 && (
              <li className="text-[13px] text-[var(--attio-text-tertiary)]">None today</li>
            )}
            {report.redFlagVisits.map((r) => (
              <li key={r.href} className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-[13px]">
                <p className="font-medium text-red-900">{r.patientName} · {r.uhid}</p>
                <p className="mt-0.5 text-[12px] text-red-700">{r.note}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Open junior exams">
          <ul className="space-y-2">
            {report.openJuniorExams.length === 0 && (
              <li className="text-[13px] text-[var(--attio-text-tertiary)]">All complete</li>
            )}
            {report.openJuniorExams.map((j) => (
              <li key={j.href}>
                <Link
                  href={j.href}
                  className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] px-3 py-2 text-[13px] hover:bg-[var(--attio-surface)]"
                >
                  <span>{j.patientName}</span>
                  <span className="font-mono text-[var(--attio-text-tertiary)]">#{j.token ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PageChrome>
  );
}
