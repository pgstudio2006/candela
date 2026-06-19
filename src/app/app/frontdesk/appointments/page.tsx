"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFrontdeskFormSchema } from "@/components/frontdesk/use-frontdesk-form-schema";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { PatientSearchField } from "@/components/frontdesk/patient-search-field";
import { useToast } from "@/components/ui/toast-provider";
import { generateDaySlots, formatDisplayDate } from "@/lib/appointment-slots";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function AppointmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { bookAppointment, appointments, getPatient, patients, roster, saveSubmission } = useFrontdeskStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deptId, setDeptId] = useState("dept_spine");
  const [doctorId, setDoctorId] = useState("");
  const [selectedPatientUhid, setSelectedPatientUhid] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(20);
  const [notes, setNotes] = useState("");

  const doctors = roster.doctorsByDept[deptId] ?? roster.allDoctors;
  const activeDoctorId = doctorId || doctors[0]?.id || "";

  const booked = useMemo(
    () =>
      appointments
        .filter((a) => a.date === date)
        .map((a) => ({
          time: a.time,
          doctorId: a.doctorId,
          patientName: getPatient(a.patientId)?.name,
        })),
    [appointments, date, getPatient],
  );

  const slots = useMemo(
    () => generateDaySlots(deptId, booked, activeDoctorId),
    [deptId, booked, activeDoctorId],
  );

  const handleBook = async () => {
    if (!selectedPatientUhid) {
      toast("Select a patient first", "error");
      return;
    }
    if (!selectedTime) {
      toast("Select a time slot", "error");
      return;
    }
    const result = await bookAppointment({
      patient: selectedPatientUhid,
      department: deptId,
      doctor: activeDoctorId,
      date,
      time: selectedTime,
      duration: String(duration),
      notes,
    });
    if (result.error || !result.visitId) {
      toast(result.error ?? "Could not book — patient not found or doctor on leave", "error");
      return;
    }
    saveSubmission("appointment", {
      patient: selectedPatientUhid,
      department: deptId,
      doctor: activeDoctorId,
      date,
      time: selectedTime,
      duration,
      notes,
    }, { visitId: result.visitId });
    toast("Appointment booked", "success");
    router.push(`/app/frontdesk/check-in?visit=${result.visitId}`);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Appointments" }]}
      title="Appointments"
      meta="Calendar booking · department slots · patient search"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title={`Schedule · ${formatDisplayDate(date)}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <AttioButton variant="secondary" className="!h-8" onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() - 1);
              setDate(d.toISOString().slice(0, 10));
            }}><ChevronLeft className="size-3.5" /></AttioButton>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40 text-[13px]" />
            <AttioButton variant="secondary" className="!h-8" onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() + 1);
              setDate(d.toISOString().slice(0, 10));
            }}><ChevronRight className="size-3.5" /></AttioButton>
            <select className="h-9 rounded-md border px-2 text-[13px]" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              {roster.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            <select className="h-9 rounded-md border px-2 text-[13px]" value={activeDoctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => slot.available && setSelectedTime(slot.time)}
                className={cn(
                  "rounded-lg border px-2 py-3 text-center text-[12px] transition-colors",
                  !slot.available && "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400",
                  slot.available && selectedTime === slot.time && "border-[var(--attio-accent)] bg-blue-50 font-medium text-blue-900",
                  slot.available && selectedTime !== slot.time && "border-[var(--attio-border-subtle)] hover:bg-[var(--attio-hover)]",
                )}
              >
                <p>{slot.time}</p>
                {slot.bookedPatient && <p className="mt-0.5 truncate text-[10px]">{slot.bookedPatient.split(" ")[0]}</p>}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Book appointment">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[var(--attio-text-secondary)]">Patient *</p>
              <PatientSearchField
                value={selectedPatientUhid}
                patients={patients}
                onChange={(uhid) => setSelectedPatientUhid(uhid)}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[var(--attio-text-secondary)]">Selected slot</p>
              <p className="rounded-md bg-[var(--attio-surface)] px-3 py-2 text-[13px]">
                {selectedTime ? `${formatDisplayDate(date)} · ${selectedTime}` : "Click a slot on the calendar"}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[var(--attio-text-secondary)]">Duration (min)</p>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-9 text-[13px]" />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[var(--attio-text-secondary)]">Notes</p>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[72px] w-full rounded-md border px-3 py-2 text-[13px]" />
            </div>
            <AttioButton variant="primary" className="w-full" onClick={handleBook}>
              Book slot
            </AttioButton>
          </div>
        </Panel>
      </div>
    </PageChrome>
  );
}
