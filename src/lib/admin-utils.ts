import type { AuditEvent, MisReport, ShareSimulation } from "@/design-system/admin-data";

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAuditCsv(events: AuditEvent[]) {
  downloadCsv(
    `candela-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      ["timestamp", "module", "actor", "action", "entity_type", "entity_id", "summary", "severity"],
      ...events.map((e) => [e.at, e.module, e.actor, e.action, e.entityType, e.entityId, e.summary, e.severity]),
    ],
  );
}

export function exportPayrollCsv(sim: ShareSimulation, policyLabel: string) {
  downloadCsv(
    `revenue-share-${policyLabel.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      ["doctor", "policy", "packages_closed", "gross_collected", "doctor_share"],
      [sim.doctorName, policyLabel, String(sim.packagesClosed), String(sim.gross), String(sim.share)],
    ],
  );
}

export function exportMisReport(report: MisReport, visitsCount: number, revenue: number) {
  const rows =
    report.format === "csv"
      ? [
          ["report", "generated_at", "active_visits", "revenue_collected"],
          [report.label, new Date().toISOString(), String(visitsCount), String(revenue)],
        ]
      : [
          ["report", "generated_at", "note"],
          [report.label, new Date().toISOString(), `Active visits: ${visitsCount}, Revenue: ${revenue}`],
        ];
  downloadCsv(
    `mis-${report.id}-${new Date().toISOString().slice(0, 10)}.${report.format === "csv" ? "csv" : "csv"}`,
    rows,
  );
}

export function notifyClinicalUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-clinical-updated"));
  }
}

export function notifyDoctorUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-doctor-updated"));
  }
}
