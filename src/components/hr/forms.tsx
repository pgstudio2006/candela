"use client";

import { AttioButton } from "@/components/frontdesk/ui";
import {
  CRM_AGENT_OPTIONS,
  LEAVE_TYPE_LABELS,
  type HrDepartment,
  type HrEmployee,
  type LeaveType,
} from "@/design-system/hr-data";
import { Input } from "@/components/ui/input";
import { useEffect, useState, type ReactNode } from "react";

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function EmployeeFormModal({
  departments,
  employees,
  initial,
  onClose,
  onSave,
}: {
  departments: HrDepartment[];
  employees: HrEmployee[];
  initial?: HrEmployee;
  onClose: () => void;
  onSave: (data: Omit<HrEmployee, "id"> | Partial<HrEmployee>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? departments[0]?.id ?? "");
  const [managerId, setManagerId] = useState(initial?.managerId ?? "hr_mgr");
  const [salaryMonthly, setSalaryMonthly] = useState(String(initial?.salaryMonthly ?? 40000));
  const [employmentType, setEmploymentType] = useState<HrEmployee["employmentType"]>(initial?.employmentType ?? "full_time");
  const [crmAgentId, setCrmAgentId] = useState(initial?.crmAgentId ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <ModalShell title={initial ? "Edit employee" : "Add employee"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            email,
            phone,
            departmentId,
            designation,
            managerId: managerId || undefined,
            joinDate: initial?.joinDate ?? new Date().toISOString().slice(0, 10),
            employmentType,
            branchId: initial?.branchId ?? "branch_gurgaon",
            active,
            role: initial?.role ?? "employee",
            crmAgentId: crmAgentId || undefined,
            salaryMonthly: Number(salaryMonthly) || 40000,
          });
          onClose();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          <select className="h-9 rounded-md border px-2 text-[13px]" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border px-2 text-[13px]" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            {employees.filter((e) => e.role !== "employee" || e.id !== initial?.id).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <Input placeholder="Monthly salary (₹)" type="number" value={salaryMonthly} onChange={(e) => setSalaryMonthly(e.target.value)} />
          <select className="h-9 rounded-md border px-2 text-[13px]" value={employmentType} onChange={(e) => setEmploymentType(e.target.value as HrEmployee["employmentType"])}>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
          </select>
          <select className="h-9 rounded-md border px-2 text-[13px] sm:col-span-2" value={crmAgentId} onChange={(e) => setCrmAgentId(e.target.value)}>
            <option value="">No CRM link</option>
            {CRM_AGENT_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active employee
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <AttioButton variant="secondary" type="button" onClick={onClose}>Cancel</AttioButton>
          <AttioButton variant="primary" type="submit">Save</AttioButton>
        </div>
      </form>
    </ModalShell>
  );
}

export function ShiftFormModal({
  employees,
  leaveRequests = [],
  date,
  initial,
  onClose,
  onSave,
}: {
  employees: HrEmployee[];
  leaveRequests?: import("@/design-system/hr-data").HrLeaveRequest[];
  date: string;
  initial?: { employeeId: string; startTime: string; endTime: string; location: string; role: string };
  onClose: () => void;
  onSave: (data: { employeeId: string; date: string; startTime: string; endTime: string; location: string; role: string }) => void;
}) {
  const staff = employees.filter(
    (e) =>
      e.active &&
      e.role !== "manager" &&
      !leaveRequests.some(
        (l) =>
          l.employeeId === e.id &&
          l.status === "approved" &&
          date >= l.fromDate &&
          date <= l.toDate,
      ),
  );
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? staff[0]?.id ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "18:00");
  const [location, setLocation] = useState(initial?.location ?? "Gurgaon OPD");
  const [role, setRole] = useState(initial?.role ?? staff.find((e) => e.id === employeeId)?.designation ?? "");

  useEffect(() => {
    const emp = staff.find((e) => e.id === employeeId);
    if (emp && !initial) setRole(emp.designation);
  }, [employeeId, staff, initial]);

  return (
    <ModalShell title="Schedule shift" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ employeeId, date, startTime, endTime, location, role });
          onClose();
        }}
      >
        <select className="h-9 w-full rounded-md border px-2 text-[13px]" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          {staff.map((e) => (
            <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[var(--attio-text-tertiary)]">Start</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-[var(--attio-text-tertiary)]">End</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 h-9 text-[13px]" />
          </div>
        </div>
        <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <Input placeholder="Role on shift" value={role} onChange={(e) => setRole(e.target.value)} required />
        <div className="flex justify-end gap-2">
          <AttioButton variant="secondary" type="button" onClick={onClose}>Cancel</AttioButton>
          <AttioButton variant="primary" type="submit">Save shift</AttioButton>
        </div>
      </form>
    </ModalShell>
  );
}

export function LeaveRequestModal({
  employees,
  operatorId,
  onClose,
  onSave,
}: {
  employees: HrEmployee[];
  operatorId: string;
  onClose: () => void;
  onSave: (data: { employeeId: string; type: LeaveType; fromDate: string; toDate: string; reason: string; syncCrmAbsence: boolean }) => void;
}) {
  const employeeId = operatorId;
  const [type, setType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [syncCrm, setSyncCrm] = useState(true);
  const emp = employees.find((e) => e.id === employeeId);

  return (
    <ModalShell title="Request leave" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ employeeId, type, fromDate, toDate, reason, syncCrmAbsence: syncCrm && !!emp?.crmAgentId });
          onClose();
        }}
      >
        <p className="rounded-md bg-[var(--attio-surface)] px-3 py-2 text-[13px]">
          Requesting as <strong>{emp?.name ?? "you"}</strong>
        </p>
        <select className="h-9 w-full rounded-md border px-2 text-[13px]" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
          {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
        </div>
        <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        {emp?.crmAgentId && (
          <label className="flex items-center gap-2 text-[12px] text-[var(--attio-text-secondary)]">
            <input type="checkbox" checked={syncCrm} onChange={(e) => setSyncCrm(e.target.checked)} />
            Sync CRM absence & transfer open leads on approval
          </label>
        )}
        <div className="flex justify-end gap-2">
          <AttioButton variant="secondary" type="button" onClick={onClose}>Cancel</AttioButton>
          <AttioButton variant="primary" type="submit">Submit</AttioButton>
        </div>
      </form>
    </ModalShell>
  );
}
