"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { MapPoint } from "./leaflet-map-inner";

const DynamicMap = dynamic(() => import("./leaflet-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg bg-[var(--attio-surface)] text-[13px] text-[var(--attio-text-tertiary)]">
      Loading map…
    </div>
  ),
});

export function AdminLeafletMap({
  points,
  center = [23.0225, 72.5714],
  zoom = 11,
  selectedId,
  flyToId,
  className,
}: {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  selectedId?: string;
  flyToId?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--attio-border)]", className)}>
      <div className="h-[min(420px,60vh)] min-h-[320px]">
        <DynamicMap center={center} zoom={zoom} points={points} selectedId={selectedId} flyToId={flyToId} />
      </div>
    </div>
  );
}

export { geoToMapPoints, diseaseToMapPoints } from "./leaflet-map-inner";
export type { MapPoint } from "./leaflet-map-inner";
