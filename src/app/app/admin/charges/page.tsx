"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ServiceCharge = {
  id: string;
  label: string;
  category: string;
  description?: string;
  rate: number;
  unit?: string;
  gstPercent: number;
  hsnCode?: string;
  active: boolean;
};

const CATEGORIES = [
  "OPD Consult",
  "IPD Bed",
  "ICU",
  "Physiotherapy",
  "Laboratory",
  "Radiology",
  "Procedure",
  "Medicine",
  "Consumables",
  "Other",
];

export default function AdminChargesPage() {
  const [charges, setCharges] = useState<ServiceCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<ServiceCharge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCharges();
  }, []);

  const loadCharges = async () => {
    try {
      const res = await fetch("/api/admin/service-charges");
      const data = await res.json();
      if (data.ok) {
        setCharges(data.data);
      }
    } catch (err) {
      console.error("Failed to load charges", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = charges.filter((c) => {
    const matchesSearch = c.label.toLowerCase().includes(filter.toLowerCase()) || 
                         (c.description?.toLowerCase().includes(filter.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const matchesActive = showInactive || c.active;
    return matchesSearch && matchesCategory && matchesActive;
  });

  const grouped = filtered.reduce((acc, charge) => {
    if (!acc[charge.category]) acc[charge.category] = [];
    acc[charge.category].push(charge);
    return acc;
  }, {} as Record<string, ServiceCharge[]>);

  const handleSave = async (charge: ServiceCharge) => {
    try {
      const url = editing ? `/api/admin/service-charges/${editing.id}` : "/api/admin/service-charges";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(charge),
      });
      const data = await res.json();
      if (data.ok) {
        await loadCharges();
        setIsModalOpen(false);
        setEditing(null);
      } else {
        alert(data.error || "Failed to save");
      }
    } catch (err) {
      console.error("Failed to save charge", err);
      alert("Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service charge?")) return;
    try {
      const res = await fetch(`/api/admin/service-charges/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        await loadCharges();
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Failed to delete charge", err);
      alert("Failed to delete");
    }
  };

  const openModal = (charge?: ServiceCharge) => {
    setEditing(charge || null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <PageChrome
        breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Service charges" }]}
        title="Service charges catalog"
        meta="OPD, IPD, ICU, physiotherapy, laboratory rates"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--attio-text-tertiary)]">Loading...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Service charges" }]}
      title="Service charges catalog"
      meta="OPD, IPD, ICU, physiotherapy, laboratory rates"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={() => openModal()}>
          <Plus className="size-3.5" />
          Add service charge
        </AttioButton>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search charges..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <Panel key={category} title={category} className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--attio-border)] text-left text-[var(--attio-text-tertiary)]">
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Rate</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">GST %</th>
                  <th className="pb-2 font-medium">HSN</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((charge) => (
                  <tr key={charge.id} className="border-b border-[var(--attio-border-subtle)]">
                    <td className="py-3 font-medium">{charge.label}</td>
                    <td className="py-3 text-[var(--attio-text-secondary)]">{charge.description || "—"}</td>
                    <td className="py-3 tabular-nums">₹{charge.rate.toLocaleString("en-IN")}</td>
                    <td className="py-3">{charge.unit || "—"}</td>
                    <td className="py-3 tabular-nums">{charge.gstPercent}%</td>
                    <td className="py-3">{charge.hsnCode || "—"}</td>
                    <td className="py-3">
                      {charge.active ? (
                        <StatusBadge label="Active" variant="success" />
                      ) : (
                        <StatusBadge label="Inactive" variant="neutral" />
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <AttioButton variant="ghost" className="!h-7 !px-2" onClick={() => openModal(charge)}>
                          <Pencil className="size-3" />
                        </AttioButton>
                        <AttioButton variant="ghost" className="!h-7 !px-2 text-red-600" onClick={() => handleDelete(charge.id)}>
                          <Trash2 className="size-3" />
                        </AttioButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}

      {isModalOpen && (
        <ChargeModal
          charge={editing}
          categories={CATEGORIES}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditing(null);
          }}
        />
      )}
    </PageChrome>
  );
}

function ChargeModal({
  charge,
  categories,
  onSave,
  onClose,
}: {
  charge: ServiceCharge | null;
  categories: string[];
  onSave: (charge: ServiceCharge) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<ServiceCharge>>(
    charge || {
      label: "",
      category: "OPD Consult",
      description: "",
      rate: 0,
      unit: "",
      gstPercent: 18,
      hsnCode: "",
      active: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.category || !form.rate) return;
    onSave({
      id: charge?.id || "",
      label: form.label,
      category: form.category,
      description: form.description,
      rate: form.rate,
      unit: form.unit,
      gstPercent: form.gstPercent ?? 18,
      hsnCode: form.hsnCode,
      active: form.active ?? true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-[var(--attio-surface)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{charge ? "Edit" : "Add"} service charge</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium">Service name *</label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g., OPD Consult - Spine"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Rate (₹) *</label>
              <Input
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                placeholder="0"
                required
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Unit</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g., per visit"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">GST %</label>
              <Input
                type="number"
                value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) })}
                placeholder="18"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">HSN Code</label>
              <Input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <AttioButton variant="secondary" onClick={onClose}>Cancel</AttioButton>
            <AttioButton variant="primary" type="submit">Save</AttioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
