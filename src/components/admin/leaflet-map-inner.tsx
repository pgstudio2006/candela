"use client";

import type { DiseaseCluster, GeoCluster } from "@/design-system/admin-data";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
  severity: "high" | "medium" | "low";
  detail?: string;
};

const SEVERITY_COLOR = {
  high: "#dc2626",
  medium: "#f97316",
  low: "#2563eb",
} as const;

function MapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function LeafletMapInner({
  center,
  zoom,
  points,
  selectedId,
  flyToId,
}: {
  center: [number, number];
  zoom: number;
  points: MapPoint[];
  selectedId?: string;
  flyToId?: string;
}) {
  const max = Math.max(...points.map((p) => p.count), 1);
  const fly = points.find((p) => p.id === flyToId);

  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full rounded-lg" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {fly && <MapFlyTo lat={fly.lat} lng={fly.lng} zoom={13} />}
      {points.map((p) => {
        const radius = 12 + (p.count / max) * 28;
        const selected = p.id === selectedId;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{
              color: selected ? "#1b1b1b" : SEVERITY_COLOR[p.severity],
              fillColor: SEVERITY_COLOR[p.severity],
              fillOpacity: selected ? 0.55 : 0.35,
              weight: selected ? 3 : 1.5,
            }}
          >
            <Popup>
              <div className="text-[12px] leading-snug">
                <p className="font-semibold">{p.label}</p>
                <p>{p.count} cases</p>
                {p.detail && <p className="text-zinc-600">{p.detail}</p>}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export function geoToMapPoints(clusters: GeoCluster[]): MapPoint[] {
  return clusters.map((c) => ({
    id: c.id,
    label: c.city,
    lat: c.lat,
    lng: c.lng,
    count: c.patientCount,
    severity: c.severity ?? (c.patientCount > 200 ? "high" : c.patientCount > 120 ? "medium" : "low"),
    detail: `${c.patientCount} patients · ${c.topDiagnosis} · ₹${(c.revenue / 100000).toFixed(1)}L`,
  }));
}

export function diseaseToMapPoints(clusters: DiseaseCluster[]): MapPoint[] {
  return clusters.map((c) => ({
    id: c.id,
    label: c.locality,
    lat: c.lat,
    lng: c.lng,
    count: c.caseCount,
    severity: c.severity,
    detail: `${c.topDisease}${c.surgePercent ? ` · +${c.surgePercent}% surge` : ""}`,
  }));
}
