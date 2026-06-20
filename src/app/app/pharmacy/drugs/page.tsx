"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import type { DrugSchedule } from "@/design-system/pharmacy-data";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PharmacyDrugsPage() {
  const { drugs, addDrug, isManager, isPurchase } = usePharmacyStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    genericName: "",
    brandName: "",
    strength: "",
    form: "Tablet",
    route: "Oral",
    therapeuticClass: "",
    schedule: "H" as DrugSchedule,
    hsn: "3004",
    gstPercent: 12,
    unit: "strip",
    reorderLevel: 20,
    requiresRx: true,
    coldChain: false,
    substitutes: [] as string[],
    active: true,
    defaultMrp: 100,
  });

  const canEdit = isManager() || isPurchase();

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Drugs" }]}
      title="Drugs & formulary"
      meta="Generic · brand · Schedule H/H1 · HSN · GST · substitutes"
      actions={
        canEdit ? (
          <AttioButton variant="primary" onClick={() => setOpen(true)}>
            Add drug
          </AttioButton>
        ) : undefined
      }
    >
      <DataTable
        columns={[
          { key: "brand", label: "Brand" },
          { key: "generic", label: "Generic" },
          { key: "strength", label: "Strength" },
          { key: "schedule", label: "Schedule" },
          { key: "hsn", label: "HSN" },
          { key: "gst", label: "GST %" },
          { key: "reorder", label: "Reorder" },
          { key: "active", label: "Status" },
        ]}
        rows={drugs.map((d) => ({
          brand: d.brandName,
          generic: d.genericName,
          strength: `${d.strength} ${d.form}`,
          schedule: d.schedule,
          hsn: d.hsn,
          gst: d.gstPercent,
          reorder: d.reorderLevel,
          active: <StatusBadge label={d.active ? "Active" : "Inactive"} variant={d.active ? "success" : "neutral"} />,
        }))}
      />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-[15px] font-semibold">Add drug</h3>
            <div className="grid gap-2">
              <Input placeholder="Brand name" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className="h-9 text-[13px]" />
              <Input placeholder="Generic name" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="h-9 text-[13px]" />
              <Input placeholder="Strength e.g. 75mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} className="h-9 text-[13px]" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <AttioButton variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </AttioButton>
              <AttioButton
                variant="primary"
                onClick={() => {
                  if (!form.brandName || !form.genericName) return;
                  void addDrug(form).then(() => setOpen(false));
                }}
              >
                Save
              </AttioButton>
            </div>
          </div>
        </div>
      )}
    </PageChrome>
  );
}
