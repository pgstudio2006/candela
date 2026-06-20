"use client";

import {
  FormCheckbox,
  FormField,
  FormGrid,
  FormModal,
  FormNativeSelect,
  FormSubmitBar,
} from "@/components/candela/form";
import {
  CRM_AGENT_OPTIONS,
  LEAVE_TYPE_LABELS,
  type HrDepartment,
  type HrEmployee,
  type LeaveType,
} from "@/design-system/hr-data";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

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
    <FormModal open title={initial ? "Edit employee" : "Add employee"} onClose={onClose} size="md">
      <form
        id="hr-employee-form"
        className="candela-form space-y-4"
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
        <FormGrid cols={2}>
          <FormField label="Full name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
          </FormField>
          <FormField label="Designation" required>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          </FormField>
          <FormField label="Department">
            <FormNativeSelect value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </FormNativeSelect>
          </FormField>
          <FormField label="Reports to">
            <FormNativeSelect value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              {employees.filter((e) => e.role !== "employee" || e.id !== initial?.id).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </FormNativeSelect>
          </FormField>
          <FormField label="Monthly salary (₹)">
            <Input type="number" value={salaryMonthly} onChange={(e) => setSalaryMonthly(e.target.value)} />
          </FormField>
          <FormField label="Employment type">
            <FormNativeSelect value={employmentType} onChange={(e) => setEmploymentType(e.target.value as HrEmployee["employmentType"])}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
            </FormNativeSelect>
          </FormField>
          <FormField label="CRM link" span={2} hint="Optional — link to CRM agent for lead routing">
            <FormNativeSelect value={crmAgentId} onChange={(e) => setCrmAgentId(e.target.value)}>
              <option value="">No CRM link</option>
              {CRM_AGENT_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </FormNativeSelect>
          </FormField>
        </FormGrid>
        <FormCheckbox label="Active employee" checked={active} onChange={setActive} />
        <FormSubmitBar form="hr-employee-form" onCancel={onClose} submitLabel="Save employee" />
      </form>
    </FormModal>
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
        (l) => l.employeeId === e.id && l.status === "approved" && date >= l.fromDate && date <= l.toDate,
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
    <FormModal open title={`Shift · ${date}`} onClose={onClose} size="sm">
      <form
        id="hr-shift-form"
        className="candela-form space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ employeeId, date, startTime, endTime, location, role });
          onClose();
        }}
      >
        <FormGrid cols={2}>
          <FormField label="Employee" span={2}>
            <FormNativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              {staff.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </FormNativeSelect>
          </FormField>
          <FormField label="Start">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </FormField>
          <FormField label="End">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </FormField>
          <FormField label="Location" span={2}>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </FormField>
          <FormField label="Role on shift" span={2}>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </FormField>
        </FormGrid>
        <FormSubmitBar form="hr-shift-form" onCancel={onClose} submitLabel="Save shift" />
      </form>
    </FormModal>
  );
}

export function LeaveRequestModal({
  employees,
  operatorId: _operatorId,
  onClose,
  onSave,
}: {
  employees: HrEmployee[];
  operatorId?: string;
  onClose: () => void;
  onSave: (data: { employeeId: string; type: LeaveType; fromDate: string; toDate: string; reason: string }) => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  return (
    <FormModal open title="Request leave" onClose={onClose} size="sm">
      <form
        id="hr-leave-form"
        className="candela-form space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ employeeId, type, fromDate, toDate, reason });
          onClose();
        }}
      >
        <FormGrid cols={2}>
          <FormField label="Employee" span={2}>
            <FormNativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </FormNativeSelect>
          </FormField>
          <FormField label="Leave type">
            <FormNativeSelect value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((k) => (
                <option key={k} value={k}>{LEAVE_TYPE_LABELS[k]}</option>
              ))}
            </FormNativeSelect>
          </FormField>
          <FormField label="From">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
          </FormField>
          <FormField label="To">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
          </FormField>
          <FormField label="Reason" span={2}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason" />
          </FormField>
        </FormGrid>
        <FormSubmitBar form="hr-leave-form" onCancel={onClose} submitLabel="Submit request" />
      </form>
    </FormModal>
  );
}
