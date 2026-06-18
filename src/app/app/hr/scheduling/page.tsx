"use client";

import { ShiftFormModal } from "@/components/hr/forms";
import { useHrStore } from "@/components/hr/hr-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { formatWeekday, weekDates } from "@/lib/hr-platform";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function HrSchedulingPage() {
  const { shifts, employees, addShift, removeShift, isManager } = useHrStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const week = useMemo(() => weekDates(date), [date]);
  const dayShifts = shifts.filter((s) => s.date === date);

  const shiftCountByDay = useMemo(() => {
    const m: Record<string, number> = {};
    week.forEach((d) => { m[d] = shifts.filter((s) => s.date === d).length; });
    return m;
  }, [shifts, week]);

  return (
    <PageChrome breadcrumbs={[{ label: "HR", href: "/app/hr" }, { label: "Scheduling" }]} title="Shift scheduling" meta="Weekly roster · location · role">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        {week.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className={cn(
              "rounded-lg border px-3 py-2 text-center text-[12px] min-w-[72px]",
              d === date ? "border-[var(--attio-accent)] bg-[var(--attio-active)] font-medium" : "hover:bg-[var(--attio-hover)]",
            )}
          >
            <p>{formatWeekday(d)}</p>
            <p className="text-[10px] text-[var(--attio-text-tertiary)]">{shiftCountByDay[d]} shifts</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AttioButton variant="secondary" className="!h-8" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(d.toISOString().slice(0, 10)); }}><ChevronLeft className="size-3.5" /></AttioButton>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40 text-[13px]" />
        <AttioButton variant="secondary" className="!h-8" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 7); setDate(d.toISOString().slice(0, 10)); }}><ChevronRight className="size-3.5" /></AttioButton>
        {isManager() && (
          <AttioButton variant="primary" onClick={() => setShowForm(true)}><Plus className="size-3.5" /> Add shift</AttioButton>
        )}
      </div>
      <Panel title={`${dayShifts.length} shifts on ${date}`}>
        <ul className="divide-y">
          {dayShifts.length === 0 && <li className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">No shifts — click Add shift to schedule</li>}
          {dayShifts.map((s) => {
            const emp = employees.find((e) => e.id === s.employeeId);
            return (
              <li key={s.id} className="flex items-center justify-between py-3 text-[13px]">
                <div>
                  <p className="font-medium">{emp?.name}</p>
                  <p className="text-[12px] text-[var(--attio-text-tertiary)]">{s.role} · {s.location}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="tabular-nums">{s.startTime} – {s.endTime}</p>
                  {isManager() && (
                    <AttioButton variant="secondary" className="!h-7 !px-2" onClick={() => removeShift(s.id)}><Trash2 className="size-3" /></AttioButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      {showForm && (
        <ShiftFormModal
          employees={employees}
          date={date}
          onClose={() => setShowForm(false)}
          onSave={(data) => addShift(data)}
        />
      )}
    </PageChrome>
  );
}
