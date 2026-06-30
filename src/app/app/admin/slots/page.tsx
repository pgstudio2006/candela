"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";

type Slot = {
  id: string;
  doctorId?: string;
  doctorName?: string;
  departmentId?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  status: string;
  notes?: string;
};

export default function SlotManagementPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [formData, setFormData] = useState({
    doctorId: "",
    doctorName: "",
    departmentId: "",
    date: "",
    startTime: "",
    endTime: "",
    capacity: 1,
    booked: 0,
    status: "available",
    notes: "",
  });

  const loadSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slots", { credentials: "include" });
      const json = await res.json();
      if (json.ok) {
        setSlots(json.data);
      }
    } catch (error) {
      console.error("Failed to load slots:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await fetch(`/api/admin/slots/${editing.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.ok) {
          await loadSlots();
          setEditing(null);
        }
      } else {
        const res = await fetch("/api/admin/slots", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.ok) {
          await loadSlots();
        }
      }
      setShowForm(false);
      setFormData({
        doctorId: "",
        doctorName: "",
        departmentId: "",
        date: "",
        startTime: "",
        endTime: "",
        capacity: 1,
        booked: 0,
        status: "available",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to save slot:", error);
    }
  };

  const handleEdit = (slot: Slot) => {
    setEditing(slot);
    setFormData({
      doctorId: slot.doctorId || "",
      doctorName: slot.doctorName || "",
      departmentId: slot.departmentId || "",
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      booked: slot.booked,
      status: slot.status,
      notes: slot.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/slots/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        await loadSlots();
      }
    } catch (error) {
      console.error("Failed to delete slot:", error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    try {
      const newStatus = slot.status === "available" ? "blocked" : "available";
      const res = await fetch(`/api/admin/slots/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...slot, status: newStatus }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadSlots();
      }
    } catch (error) {
      console.error("Failed to toggle slot status:", error);
    }
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Slot Management" }]}
      title="Slot management"
      meta="Manage appointment slots · Doctor scheduling · Capacity control"
      actions={
        <AttioButton variant="primary" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 mr-1.5" />
          Add slot
        </AttioButton>
      }
    >
      {showForm && (
        <Panel title={editing ? "Edit slot" : "New slot"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1">Doctor ID</label>
                <input
                  type="text"
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Department ID</label>
                <input
                  type="text"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                >
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20 w-full rounded border px-3 text-[13px]"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <AttioButton variant="primary" type="submit">
                {editing ? "Update slot" : "Create slot"}
              </AttioButton>
              <AttioButton variant="secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </AttioButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="All slots">
        {loading ? (
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">Loading slots…</p>
        ) : slots.length === 0 ? (
          <p className="text-[13px] text-[var(--attio-text-tertiary)]">No slots configured yet.</p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-[var(--attio-border-subtle)] p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[13px] font-medium">
                      <Calendar className="size-3.5" />
                      {slot.date}
                    </div>
                    <div className="flex items-center gap-1 text-[13px]">
                      <Clock className="size-3.5" />
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <StatusBadge
                      label={slot.status}
                      variant={slot.status === "available" ? "success" : slot.status === "booked" ? "warning" : "neutral"}
                    />
                  </div>
                  <p className="mt-1 text-[13px]">
                    {slot.doctorName || "Unassigned"} · {slot.departmentId || "No department"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--attio-text-tertiary)]">
                    Capacity: {slot.capacity} · Booked: {slot.booked}
                  </p>
                  {slot.notes && <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">{slot.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <AttioButton variant="secondary" onClick={() => handleEdit(slot)}>
                    Edit
                  </AttioButton>
                  <AttioButton variant="secondary" onClick={() => handleToggleStatus(slot.id)}>
                    {slot.status === "available" ? "Block" : "Unblock"}
                  </AttioButton>
                  <AttioButton variant="secondary" onClick={() => handleDelete(slot.id)}>
                    <Trash2 className="size-3" />
                  </AttioButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageChrome>
  );
}
