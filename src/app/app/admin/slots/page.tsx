"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useAdminStore } from "@/components/admin/admin-store";
import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2, Copy } from "lucide-react";

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

type BulkSlotConfig = {
  doctorId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  capacity: number;
  weekdays: string[];
};

export default function SlotManagementPage() {
  const { staff } = useAdminStore();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
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
  const [bulkConfig, setBulkConfig] = useState<BulkSlotConfig>({
    doctorId: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
    intervalMinutes: 20,
    capacity: 1,
    weekdays: ["mon", "tue", "wed", "thu", "fri"],
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

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL slots? This cannot be undone.")) {
      return;
    }
    
    try {
      for (const slot of slots) {
        await fetch(`/api/admin/slots/${slot.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
      await loadSlots();
      alert(`Deleted ${slots.length} slots`);
    } catch (error) {
      console.error("Failed to clear slots:", error);
      alert("Failed to clear slots");
    }
  };

  const handleBulkCreate = async () => {
    const { doctorId, startDate, endDate, startTime, endTime, intervalMinutes, capacity, weekdays } = bulkConfig;
    
    console.log("Bulk create config:", bulkConfig);
    
    if (!doctorId) {
      alert("Please select a doctor");
      return;
    }
    if (!startDate || !endDate) {
      alert("Please select date range");
      return;
    }
    if (weekdays.length === 0) {
      alert("Please select at least one weekday");
      return;
    }

    setBulkCreating(true);

    const doctor = staff.find((s) => s.id === doctorId);
    const doctorName = doctor?.name || "";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekdayMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };

    const slotsToCreate: any[] = [];
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dayKey = Object.keys(weekdayMap).find((k) => weekdayMap[k] === dayOfWeek);
      
      if (dayKey && weekdays.includes(dayKey)) {
        const [startHour, startMin] = startTime.split(":").map(Number);
        const [endHour, endMin] = endTime.split(":").map(Number);

        let slotTime = startHour * 60 + startMin;
        const endTimeMinutes = endHour * 60 + endMin;

        while (slotTime + intervalMinutes <= endTimeMinutes) {
          const slotStart = `${String(Math.floor(slotTime / 60)).padStart(2, "0")}:${String(slotTime % 60).padStart(2, "0")}`;
          const slotEnd = `${String(Math.floor((slotTime + intervalMinutes) / 60)).padStart(2, "0")}:${String((slotTime + intervalMinutes) % 60).padStart(2, "0")}`;

          slotsToCreate.push({
            doctorId,
            doctorName,
            date: current.toISOString().slice(0, 10),
            startTime: slotStart,
            endTime: slotEnd,
            capacity,
            booked: 0,
            status: "available",
          });

          slotTime += intervalMinutes;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    console.log(`Creating ${slotsToCreate.length} slots...`);

    if (slotsToCreate.length === 0) {
      setBulkCreating(false);
      alert("No slots to create based on the configuration");
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const slot of slotsToCreate) {
        try {
          const res = await fetch("/api/admin/slots", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slot),
          });
          const json = await res.json();
          if (json.ok) {
            successCount++;
          } else {
            console.error("Failed to create slot:", json.error);
            failCount++;
          }
        } catch (error) {
          console.error("Error creating slot:", error);
          failCount++;
        }
      }
      
      await loadSlots();
      setShowBulkForm(false);
      setBulkCreating(false);
      
      if (failCount > 0) {
        alert(`Created ${successCount} slots, ${failCount} failed`);
      } else {
        alert(`Successfully created ${successCount} slots`);
      }
    } catch (error) {
      console.error("Failed to create bulk slots:", error);
      setBulkCreating(false);
      alert("Failed to create slots");
    }
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Slot Management" }]}
      title="Slot management"
      meta="Manage appointment slots · Doctor scheduling · Capacity control"
      actions={
        <div className="flex gap-2">
          {slots.length > 0 && (
            <AttioButton variant="secondary" onClick={handleClearAll}>
              <Trash2 className="size-3.5 mr-1.5" />
              Clear all
            </AttioButton>
          )}
          <AttioButton variant="secondary" onClick={() => setShowBulkForm(true)}>
            <Copy className="size-3.5 mr-1.5" />
            Bulk create
          </AttioButton>
          <AttioButton variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5 mr-1.5" />
            Add slot
          </AttioButton>
        </div>
      }
    >
      {showBulkForm && (
        <Panel title="Bulk create slots">
          <div className="space-y-4">
            {bulkCreating && (
              <div className="rounded-md bg-blue-50 p-3 text-center text-[13px] text-blue-900">
                Creating slots... Please wait.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[12px] font-medium mb-1">Select Doctor</label>
                <select
                  value={bulkConfig.doctorId}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, doctorId: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                >
                  <option value="">Select a doctor...</option>
                  {staff.filter((s) => s.role === "doctor").map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={bulkConfig.startDate}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, startDate: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={bulkConfig.endDate}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, endDate: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={bulkConfig.startTime}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, startTime: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={bulkConfig.endTime}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, endTime: e.target.value })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={bulkConfig.intervalMinutes}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, intervalMinutes: Number(e.target.value) })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1">Capacity per slot</label>
                <input
                  type="number"
                  min="1"
                  value={bulkConfig.capacity}
                  onChange={(e) => setBulkConfig({ ...bulkConfig, capacity: Number(e.target.value) })}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                  disabled={bulkCreating}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-medium mb-1">Weekdays</label>
                <div className="flex flex-wrap gap-2">
                  {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                    <label key={day} className="flex items-center gap-1 text-[12px]">
                      <input
                        type="checkbox"
                        checked={bulkConfig.weekdays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkConfig({ ...bulkConfig, weekdays: [...bulkConfig.weekdays, day] });
                          } else {
                            setBulkConfig({ ...bulkConfig, weekdays: bulkConfig.weekdays.filter((d) => d !== day) });
                          }
                        }}
                        disabled={bulkCreating}
                      />
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <AttioButton variant="primary" onClick={handleBulkCreate} disabled={bulkCreating}>
                {bulkCreating ? "Creating slots..." : "Create slots"}
              </AttioButton>
              <AttioButton variant="secondary" onClick={() => setShowBulkForm(false)} disabled={bulkCreating}>
                Cancel
              </AttioButton>
            </div>
          </div>
        </Panel>
      )}

      {showForm && (
        <Panel title={editing ? "Edit slot" : "New slot"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[12px] font-medium mb-1">Select Doctor</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => {
                    const selectedDoctor = staff.find((s) => s.id === e.target.value);
                    setFormData({
                      ...formData,
                      doctorId: e.target.value,
                      doctorName: selectedDoctor?.name || "",
                    });
                  }}
                  className="h-9 w-full rounded border px-3 text-[13px]"
                >
                  <option value="">Select a doctor...</option>
                  {staff.filter((s) => s.role === "doctor").map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
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
