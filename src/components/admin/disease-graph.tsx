"use client";

import type { DiseaseMapNode } from "@/design-system/admin-data";
import { StatusBadge } from "@/components/frontdesk/ui";

export function DiseaseMappingGraph({ nodes }: { nodes: DiseaseMapNode[] }) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <div key={node.id} className="rounded-xl border border-[var(--attio-border)] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold">{node.label}</p>
              <p className="text-[12px] text-[var(--attio-text-tertiary)]">ICD {node.icd}</p>
            </div>
            <StatusBadge label={node.departmentId.replace("dept_", "")} variant="info" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            {node.templateId && (
              <span className="rounded-full border border-[var(--attio-border)] px-2 py-0.5">Template → {node.templateId}</span>
            )}
            {node.packageIds.map((p) => (
              <span key={p} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">Package → {p}</span>
            ))}
            {node.consentTemplateIds.map((c) => (
              <span key={c} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">Consent → {c.replace("consent_", "")}</span>
            ))}
            {node.billingTemplateId && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">Bill → {node.billingTemplateId}</span>
            )}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--attio-border-subtle)]">
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-[var(--attio-accent)] to-emerald-500" />
          </div>
          <p className="mt-1 text-[10px] text-[var(--attio-text-tertiary)]">Care path fully mapped · diagnosis → template → package → consent → billing</p>
        </div>
      ))}
    </div>
  );
}
