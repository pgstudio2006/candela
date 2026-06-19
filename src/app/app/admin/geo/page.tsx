"use client";

import { AdminLeafletMap, geoToMapPoints } from "@/components/admin/leaflet-map";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { geoClustersToCsv } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";
import { Download, MapPin, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

const SEVERITY_DOT = {
  high: "bg-red-500",
  medium: "bg-orange-500",
  low: "bg-blue-500",
} as const;

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminGeoPage() {
  const { geo, diseaseClusters, settings, logAdminAction, refresh, ready } = useAdminStore();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const activeId = selectedId ?? geo[0]?.id;
  const mapPoints = useMemo(() => geoToMapPoints(geo), [geo]);
  const totalPatients = geo.reduce((s, g) => s + g.patientCount, 0);
  const totalRevenue = geo.reduce((s, g) => s + g.revenue, 0);
  const highDemand = geo.filter((g) => (g.severity ?? "medium") === "high");

  const exportGeo = () => {
    downloadCsv(`candela-geo-intelligence-${new Date().toISOString().slice(0, 10)}.csv`, geoClustersToCsv(geo));
    void logAdminAction("Exported geo intelligence report");
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Geo intelligence" }]}
      title="Geolocation intelligence"
      meta="Live map · patient distribution · demand vs capacity · OpenStreetMap"
      actions={
        <div className="flex gap-2">
          <AttioButton variant="secondary" onClick={() => void refresh()} disabled={!ready}>
            <RefreshCw className="size-3.5" />
            Refresh
          </AttioButton>
          <AttioButton variant="secondary" onClick={exportGeo}>
            <Download className="size-3.5" />
            Export CSV
          </AttioButton>
        </div>
      }
    >
      {settings.outbreakAlerts && highDemand.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <p className="font-medium">High-demand zones detected</p>
          <p className="mt-0.5">
            {highDemand.map((g) => g.city).join(", ")} — review capacity and outreach. Top conditions:{" "}
            {highDemand.map((g) => g.topDiagnosis).filter((x) => x !== "—").join(", ") || "pending consult data"}.
          </p>
        </div>
      )}

      <MetricStrip
        metrics={[
          { label: "Localities tracked", value: String(geo.length), delta: "Live + baseline clusters", trend: "neutral" },
          { label: "Total patients (geo)", value: totalPatients.toLocaleString("en-IN"), delta: "Aggregate cohort", trend: "neutral" },
          { label: "Revenue mapped", value: `₹${(totalRevenue / 10000000).toFixed(1)}Cr`, delta: "By pincode cluster", trend: "up" },
          { label: "High-demand zones", value: String(highDemand.length), delta: "Needs capacity review", trend: "up" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <AdminLeafletMap points={mapPoints} selectedId={activeId} flyToId={activeId} />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--attio-text-tertiary)]">
            <MapPin className="size-3" />
            OpenStreetMap · click an area to focus · circle size = patient volume · pincode from registration
          </p>
        </div>
        <Panel title="Select an area">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {geo.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={cn(
                    "flex w-full items-center justify-between py-3 text-left text-[13px]",
                    activeId === g.id && "bg-[var(--attio-surface)]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        SEVERITY_DOT[g.severity ?? (g.patientCount > 200 ? "high" : g.patientCount > 120 ? "medium" : "low")],
                      )}
                    />
                    <span>
                      <span className="font-medium">{g.city}</span>
                      <span className="block text-[11px] text-[var(--attio-text-tertiary)]">{g.pincode}</span>
                    </span>
                  </span>
                  <span className="tabular-nums">{g.patientCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {diseaseClusters.length > 0 && (
        <Panel title="Disease clusters by locality" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diseaseClusters.slice(0, 6).map((dc) => (
              <div key={dc.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium">{dc.locality}</p>
                  <StatusBadge
                    label={dc.severity}
                    variant={dc.severity === "high" ? "danger" : dc.severity === "low" ? "info" : "warning"}
                  />
                </div>
                <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">{dc.topDisease}</p>
                <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">
                  {dc.caseCount} cases
                  {dc.surgePercent ? ` · +${dc.surgePercent}% surge` : ""}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Cluster detail" className="mt-4">
        <DataTable
          columns={[
            { key: "city", label: "Area" },
            { key: "patients", label: "Patients" },
            { key: "opd", label: "OPD" },
            { key: "ipd", label: "IPD" },
            { key: "revenue", label: "Revenue" },
            { key: "dx", label: "Top diagnosis" },
            { key: "severity", label: "Demand" },
          ]}
          rows={geo.map((g) => ({
            city: `${g.city} (${g.pincode})`,
            patients: g.patientCount,
            opd: g.opdCount,
            ipd: g.ipdCount,
            revenue: `₹${(g.revenue / 100000).toFixed(1)}L`,
            dx: g.topDiagnosis,
            severity: (
              <StatusBadge
                label={g.severity === "high" ? "High" : g.severity === "low" ? "Low" : "Medium"}
                variant={g.severity === "high" ? "danger" : g.severity === "low" ? "info" : "warning"}
              />
            ),
          }))}
          onRowClick={(i) => setSelectedId(geo[i]?.id)}
        />
      </Panel>
    </PageChrome>
  );
}
