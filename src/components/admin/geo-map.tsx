"use client";

import type { GeoCluster } from "@/design-system/admin-data";
import { cn } from "@/lib/utils";

export function GeoDistributionMap({ clusters }: { clusters: GeoCluster[] }) {
  const max = Math.max(...clusters.map((c) => c.patientCount), 1);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--attio-border)] bg-gradient-to-br from-slate-50 to-blue-50/30 p-4">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="relative aspect-[16/10] min-h-[320px]">
        {clusters.map((c) => {
          const size = 24 + (c.patientCount / max) * 48;
          const left = `${15 + ((c.lng - 76.7) / 0.5) * 70}%`;
          const top = `${20 + ((28.6 - c.lat) / 0.4) * 60}%`;
          return (
            <div
              key={c.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <div
                className={cn(
                  "rounded-full bg-[var(--attio-accent)]/70 shadow-lg ring-2 ring-white transition-transform hover:scale-110",
                )}
                style={{ width: size, height: size }}
              />
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-48 -translate-x-1/2 rounded-lg border border-[var(--attio-border)] bg-white p-2 shadow-lg group-hover:block">
                <p className="text-[12px] font-semibold">{c.city}</p>
                <p className="text-[11px] text-[var(--attio-text-tertiary)]">{c.pincode}</p>
                <p className="mt-1 text-[11px]">{c.patientCount} patients · ₹{(c.revenue / 100000).toFixed(1)}L</p>
                <p className="text-[10px] text-[var(--attio-text-secondary)]">Top: {c.topDiagnosis}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--attio-text-tertiary)]">NCR patient distribution · aggregate clusters · hover for detail</p>
    </div>
  );
}
