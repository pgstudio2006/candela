"use client";

import { AdminLeafletMap, geoToMapPoints } from "@/components/admin/leaflet-map";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, MetricStrip, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { cn } from "@/lib/utils";
import { Download, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

const SEVERITY_DOT = {
  high: "bg-red-500",
  medium: "bg-orange-500",
  low: "bg-blue-500",
} as const;

export default function AdminGeoPage() {
  const { geo, logAdminAction } = useAdminStore();
  const [selectedId, setSelectedId] = useState(geo[0]?.id);

  const mapPoints = useMemo(() => geoToMapPoints(geo), [geo]);
  const totalPatients = geo.reduce((s, g) => s + g.patientCount, 0);
  const totalRevenue = geo.reduce((s, g) => s + g.revenue, 0);

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Geo intelligence" }]}
      title="Geolocation intelligence"
      meta="Real map · patient distribution · demand vs capacity · OpenStreetMap"
      actions={
        <AttioButton variant="secondary" onClick={() => logAdminAction("Exported geo intelligence report")}>
          <Download className="size-3.5" />
          Export
        </AttioButton>
      }
    >
      <MetricStrip
        metrics={[
          { label: "Localities tracked", value: String(geo.length), delta: "Ahmedabad metro", trend: "neutral" },
          { label: "Total patients (geo)", value: totalPatients.toLocaleString("en-IN"), delta: "Aggregate cohort", trend: "neutral" },
          { label: "Revenue mapped", value: `₹${(totalRevenue / 10000000).toFixed(1)}Cr`, delta: "By pincode cluster", trend: "up" },
          { label: "High-demand zones", value: String(geo.filter((g) => (g.severity ?? "medium") === "high").length), delta: "Needs capacity review", trend: "up" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <AdminLeafletMap points={mapPoints} selectedId={selectedId} flyToId={selectedId} />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--attio-text-tertiary)]">
            <MapPin className="size-3" />
            OpenStreetMap · click an area to focus · circle size = patient volume
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
                    selectedId === g.id && "bg-[var(--attio-surface)]",
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
          rows={geo.map((g, i) => ({
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
