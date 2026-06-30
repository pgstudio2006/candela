"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useState } from "react";

type ReferralDoctor = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  clinicName?: string;
  specialization?: string;
  commissionPercent: number;
  active: boolean;
  notes?: string;
};

export default function ReferralDoctorsPage() {
  const [doctors, setDoctors] = useState<ReferralDoctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReferralDoctor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    clinicName: "",
    specialization: "",
    commissionPercent: 0,
    active: true,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      setDoctors(doctors.map((d) => (d.id === editing.id ? { ...formData, id: editing.id } : d)));
      setEditing(null);
    } else {
      setDoctors([...doctors, { ...formData, id: `rd_${Date.now()}` }]);
    }
    setShowForm(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      clinicName: "",
      specialization: "",
      commissionPercent: 0,
      active: true,
      notes: "",
    });
  };

  const handleEdit = (doctor: ReferralDoctor) => {
    setEditing(doctor);
    setFormData({
      name: doctor.name,
      phone: doctor.phone ?? "",
      email: doctor.email ?? "",
      clinicName: doctor.clinicName ?? "",
      specialization: doctor.specialization ?? "",
      commissionPercent: doctor.commissionPercent,
      active: doctor.active,
      notes: doctor.notes ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDoctors(doctors.filter((d) => d.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setDoctors(doctors.map((d) => (d.id === id ? { ...d, active: !d.active } : d)));
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Referral doctors" }]}
      title="Referral doctor management"
      meta="Manage external doctors · Track commissions · Patient referrals"
      actions={
        <AttioButton variant="primary" onClick={() => setShowForm(true)}>
          Add referral doctor
        </AttioButton>
      }
    >
      {showForm && (
        <Panel title={editing ? "Edit referral doctor" : "Add referral doctor"}>
          <form onSubmit={handleSubmit} className="space-y-4 text-[13px]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                Doctor name
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
              <label className="block">
                Phone
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
              <label className="block">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
              <label className="block">
                Clinic name
                <input
                  type="text"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
              <label className="block">
                Specialization
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
              <label className="block">
                Commission %
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionPercent}
                  onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                  className="mt-1 h-9 w-full rounded-lg border px-3"
                />
              </label>
            </div>
            <label className="block">
              Notes
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 h-20 w-full rounded-lg border px-3"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex gap-2">
              <AttioButton type="submit" variant="primary">
                {editing ? "Update" : "Add"} doctor
              </AttioButton>
              <AttioButton type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </AttioButton>
            </div>
          </form>
        </Panel>
      )}

      {doctors.length === 0 && !showForm && (
        <Panel title="No referral doctors">
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">
            No referral doctors have been added yet. Click "Add referral doctor" to get started.
          </p>
        </Panel>
      )}

      {doctors.length > 0 && (
        <Panel title="Referral doctors">
          <div className="space-y-2">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="flex items-center justify-between rounded-lg border p-3 text-[13px]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{doctor.name}</p>
                    <StatusBadge label={doctor.active ? "Active" : "Inactive"} variant={doctor.active ? "success" : "neutral"} />
                  </div>
                  <p className="mt-1 text-[var(--attio-text-tertiary)]">
                    {doctor.clinicName && `${doctor.clinicName} · `}
                    {doctor.specialization && `${doctor.specialization} · `}
                    {doctor.phone && doctor.phone}
                  </p>
                  <p className="mt-1 text-[var(--attio-accent)]">Commission: {doctor.commissionPercent}%</p>
                </div>
                <div className="flex gap-2">
                  <AttioButton variant="secondary" onClick={() => handleEdit(doctor)}>
                    Edit
                  </AttioButton>
                  <AttioButton variant="secondary" onClick={() => handleToggleActive(doctor.id)}>
                    {doctor.active ? "Deactivate" : "Activate"}
                  </AttioButton>
                  <AttioButton variant="secondary" onClick={() => handleDelete(doctor.id)}>
                    Delete
                  </AttioButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </PageChrome>
  );
}
