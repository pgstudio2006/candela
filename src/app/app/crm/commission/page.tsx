"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { IndianRupee, Save } from "lucide-react";
import { useEffect, useState } from "react";

type SlabEntry = {
  id: string;
  name: string;
  email: string;
  role: string;
  commissionPercent: number;
};

export default function CrmCommissionSlabPage() {
  const { isManager } = useCrmStore();
  const [slabs, setSlabs] = useState<SlabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/commission-slab", { credentials: "include" });
      const json = await res.json();
      if (json.ok) {
        setSlabs(json.data);
        const editMap: Record<string, string> = {};
        for (const s of json.data as SlabEntry[]) {
          editMap[s.id] = String(s.commissionPercent);
        }
        setEditing(editMap);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (operatorId: string) => {
    const value = parseFloat(editing[operatorId] ?? "0");
    if (isNaN(value) || value < 0 || value > 100) {
      setToast("Commission percent must be between 0 and 100.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSaving(operatorId);
    try {
      const res = await fetch("/api/crm/commission-slab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ operatorId, commissionPercent: value }),
      });
      const json = await res.json();
      if (json.ok) {
        setToast(`Updated ${json.data.name}'s commission to ${json.data.commissionPercent}%`);
        setTimeout(() => setToast(null), 3000);
        void load();
      } else {
        setToast(`Error: ${json.error}`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast("Failed to save.");
      setTimeout(() => setToast(null), 3000);
    }
    setSaving(null);
  };

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Commission Slabs" }]} title="Commission Slabs" meta="Manager only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Commission slab management is available in the manager workspace only.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Commission Slabs" }]}
      title="Commission slab management"
      meta="Set default commission percentage per counsellor"
    >
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
          {toast}
        </div>
      )}

      <Panel title="Default commission rates">
        {loading ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">Loading…</p>
        ) : slabs.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--attio-text-tertiary)]">No active operators found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--attio-border-subtle)] text-[11px] text-[var(--attio-text-tertiary)]">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Current %</th>
                  <th className="py-2 pr-4 font-medium">New %</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--attio-border-subtle)]">
                {slabs.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                    <td className="py-2.5 pr-4 capitalize">{s.role}</td>
                    <td className="py-2.5 pr-4 text-[var(--attio-text-secondary)]">{s.email}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="size-3 text-[var(--attio-text-tertiary)]" />
                        {s.commissionPercent}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editing[s.id] ?? ""}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="h-8 w-20 rounded-lg border border-[var(--attio-border)] px-2 text-[13px] tabular-nums"
                      />
                    </td>
                    <td className="py-2.5 pr-4">
                      <AttioButton
                        variant="secondary"
                        disabled={saving === s.id || editing[s.id] === String(s.commissionPercent)}
                        onClick={() => void handleSave(s.id)}
                        className="gap-1 !h-7 !text-[11px]"
                      >
                        <Save className="size-3" />
                        {saving === s.id ? "Saving…" : "Save"}
                      </AttioButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="How commission slabs work" className="mt-4">
        <div className="space-y-2 text-[12px] text-[var(--attio-text-secondary)]">
          <p>The default commission percentage set here is applied when a new commission record is created for a counsellor.</p>
          <p>When a lead converts to a patient and a bill is generated, the commission amount is calculated as:</p>
          <p className="rounded-lg bg-[var(--attio-surface)] p-2 font-mono text-[11px]">
            commission_amount = bill_amount × (commission_percent / 100)
          </p>
          <p>You can override the percentage for individual commission records from the Finance page.</p>
        </div>
      </Panel>
    </PageChrome>
  );
}
