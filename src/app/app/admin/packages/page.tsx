"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Plus, Pencil, Trash2, Package as PackageIcon } from "lucide-react";

type PackageService = {
  serviceId: string;
  label: string;
  quantity: number;
  rate: number;
};

type CarePackage = {
  id: string;
  label: string;
  amount: number;
  sessions?: number;
  dept?: string;
  services: PackageService[];
  active: boolean;
};

const DEPARTMENTS = [
  "dept_spine",
  "dept_wellness",
  "dept_knee",
  "dept_shoulder",
  "dept_general",
];

const MOCK_SERVICES = [
  { id: "1", label: "OPD Consult - Spine", rate: 800 },
  { id: "2", label: "Physiotherapy Session", rate: 1200 },
  { id: "3", label: "Manual Therapy", rate: 800 },
  { id: "4", label: "MRI - Spine", rate: 8500 },
  { id: "5", label: "X-Ray - Spine", rate: 800 },
  { id: "6", label: "CBC Panel", rate: 450 },
  { id: "7", label: "Metabolic Panel", rate: 1200 },
  { id: "8", label: "IPD Bed - Private Room", rate: 3500 },
  { id: "9", label: "ICU - Basic", rate: 8500 },
];

const MOCK_PACKAGES: CarePackage[] = [
  {
    id: "pkg_opd",
    label: "Essential MSK Care",
    amount: 15000,
    sessions: 3,
    dept: "dept_spine",
    services: [
      { serviceId: "1", label: "OPD Consult - Spine", quantity: 1, rate: 800 },
      { serviceId: "2", label: "Physiotherapy Session", quantity: 3, rate: 1200 },
      { serviceId: "3", label: "Manual Therapy", quantity: 2, rate: 800 },
    ],
    active: true,
  },
  {
    id: "pkg_basic",
    label: "Standard MSK Care",
    amount: 32000,
    sessions: 6,
    dept: "dept_spine",
    services: [
      { serviceId: "1", label: "OPD Consult - Spine", quantity: 2, rate: 800 },
      { serviceId: "2", label: "Physiotherapy Session", quantity: 6, rate: 1200 },
      { serviceId: "3", label: "Manual Therapy", quantity: 4, rate: 800 },
      { serviceId: "5", label: "X-Ray - Spine", quantity: 1, rate: 800 },
      { serviceId: "6", label: "CBC Panel", quantity: 1, rate: 450 },
    ],
    active: true,
  },
  {
    id: "pkg_regen",
    label: "Premium Regenerative Care",
    amount: 85000,
    sessions: 12,
    dept: "dept_spine",
    services: [
      { serviceId: "1", label: "OPD Consult - Spine", quantity: 4, rate: 800 },
      { serviceId: "2", label: "Physiotherapy Session", quantity: 12, rate: 1200 },
      { serviceId: "3", label: "Manual Therapy", quantity: 8, rate: 800 },
      { serviceId: "4", label: "MRI - Spine", quantity: 1, rate: 8500 },
      { serviceId: "5", label: "X-Ray - Spine", quantity: 2, rate: 800 },
      { serviceId: "7", label: "Metabolic Panel", quantity: 1, rate: 1200 },
    ],
    active: true,
  },
];

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<CarePackage[]>(MOCK_PACKAGES);
  const [filter, setFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<CarePackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = packages.filter((p) => {
    const matchesSearch = p.label.toLowerCase().includes(filter.toLowerCase());
    const matchesDept = deptFilter === "all" || p.dept === deptFilter;
    const matchesActive = showInactive || p.active;
    return matchesSearch && matchesDept && matchesActive;
  });

  const handleSave = (pkg: CarePackage) => {
    if (editing) {
      setPackages(packages.map((p) => p.id === editing.id ? pkg : p));
    } else {
      setPackages([...packages, { ...pkg, id: `pkg_${Date.now()}` }]);
    }
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this package?")) {
      setPackages(packages.filter((p) => p.id !== id));
    }
  };

  const openModal = (pkg?: CarePackage) => {
    setEditing(pkg || null);
    setIsModalOpen(true);
  };

  const calculateServiceTotal = (services: PackageService[]) => {
    return services.reduce((sum, s) => sum + (s.rate * s.quantity), 0);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Care packages" }]}
      title="Care packages builder"
      meta="Named sets of services with editable quantities"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={() => openModal()}>
          <Plus className="size-3.5" />
          Add package
        </AttioButton>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search packages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
        >
          <option value="all">All departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept.replace("dept_", "").toUpperCase()}</option>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((pkg) => (
          <Panel key={pkg.id} title={pkg.label} className="relative">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] text-[var(--attio-text-tertiary)]">
                {pkg.dept?.replace("dept_", "").toUpperCase()} · {pkg.sessions} sessions
              </span>
              {pkg.active ? (
                <StatusBadge label="Active" variant="success" />
              ) : (
                <StatusBadge label="Inactive" variant="neutral" />
              )}
            </div>
            
            <div className="mb-3 space-y-1 text-[12px]">
              <div className="font-semibold text-[var(--attio-text-tertiary)]">Included services:</div>
              {pkg.services.map((service, idx) => (
                <div key={idx} className="flex justify-between text-[var(--attio-text-secondary)]">
                  <span>{service.label}</span>
                  <span className="tabular-nums">×{service.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 border-t border-[var(--attio-border)] pt-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--attio-text-tertiary)]">Package price</span>
                <span className="font-semibold tabular-nums">₹{pkg.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[var(--attio-text-tertiary)]">
                <span>Service total</span>
                <span className="tabular-nums">₹{calculateServiceTotal(pkg.services).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-1">
              <AttioButton variant="ghost" className="flex-1 !h-7 !px-2" onClick={() => openModal(pkg)}>
                <Pencil className="size-3" />
              </AttioButton>
              <AttioButton variant="ghost" className="flex-1 !h-7 !px-2 text-red-600" onClick={() => handleDelete(pkg.id)}>
                <Trash2 className="size-3" />
              </AttioButton>
            </div>
          </Panel>
        ))}
      </div>

      {isModalOpen && (
        <PackageModal
          package={editing}
          departments={DEPARTMENTS}
          availableServices={MOCK_SERVICES}
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

function PackageModal({
  package: pkg,
  departments,
  availableServices,
  onSave,
  onClose,
}: {
  package: CarePackage | null;
  departments: string[];
  availableServices: { id: string; label: string; rate: number }[];
  onSave: (pkg: CarePackage) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CarePackage>>(
    pkg || {
      label: "",
      amount: 0,
      sessions: 6,
      dept: "dept_spine",
      services: [],
      active: true,
    }
  );

  const addService = (serviceId: string) => {
    const service = availableServices.find((s) => s.id === serviceId);
    if (!service) return;
    if (form.services?.some((s) => s.serviceId === serviceId)) return;
    setForm({
      ...form,
      services: [
        ...(form.services || []),
        { serviceId, label: service.label, quantity: 1, rate: service.rate },
      ],
    });
  };

  const removeService = (serviceId: string) => {
    setForm({
      ...form,
      services: form.services?.filter((s) => s.serviceId !== serviceId) || [],
    });
  };

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    setForm({
      ...form,
      services: form.services?.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s
      ) || [],
    });
  };

  const calculateTotal = () => {
    return (form.services || []).reduce((sum, s) => sum + s.rate * s.quantity, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    onSave({
      id: pkg?.id || "",
      label: form.label,
      amount: form.amount,
      sessions: form.sessions,
      dept: form.dept,
      services: form.services || [],
      active: form.active ?? true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-[var(--attio-surface)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{pkg ? "Edit" : "Add"} care package</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Package name *</label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g., Standard MSK Care"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Department *</label>
              <select
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
                className="w-full rounded-md border border-[var(--attio-border)] px-3 py-2 text-[13px]"
                required
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept.replace("dept_", "").toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Package price (₹) *</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="0"
                required
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Sessions</label>
              <Input
                type="number"
                value={form.sessions}
                onChange={(e) => setForm({ ...form, sessions: Number(e.target.value) })}
                placeholder="6"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium">Services</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {availableServices.map((service) => (
                <AttioButton
                  key={service.id}
                  variant="ghost"
                  className="!h-7 !px-2 text-[11px]"
                  onClick={() => addService(service.id)}
                  disabled={form.services?.some((s) => s.serviceId === service.id)}
                >
                  <PackageIcon className="mr-1 size-3" />
                  {service.label}
                </AttioButton>
              ))}
            </div>
            
            {form.services && form.services.length > 0 && (
              <div className="space-y-2 rounded-lg border border-[var(--attio-border)] p-3">
                {form.services.map((service) => (
                  <div key={service.serviceId} className="flex items-center justify-between text-[12px]">
                    <span className="flex-1">{service.label}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={service.quantity}
                        onChange={(e) => updateServiceQuantity(service.serviceId, Number(e.target.value))}
                        className="w-16 h-7 text-center"
                        min={1}
                      />
                      <span className="text-[var(--attio-text-tertiary)]">× ₹{service.rate}</span>
                      <span className="w-20 text-right tabular-nums">₹{(service.quantity * service.rate).toLocaleString("en-IN")}</span>
                      <AttioButton
                        variant="ghost"
                        className="!h-6 !px-1 text-red-600"
                        onClick={() => removeService(service.serviceId)}
                      >
                        <Trash2 className="size-3" />
                      </AttioButton>
                    </div>
                  </div>
                ))}
                <div className="border-t border-[var(--attio-border)] pt-2 text-right text-[13px] font-semibold">
                  Service total: ₹{calculateTotal().toLocaleString("en-IN")}
                </div>
              </div>
            )}
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
            <AttioButton variant="primary" type="submit">Save package</AttioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
