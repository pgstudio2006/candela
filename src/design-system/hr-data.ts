/** HR workspace — people ops, scheduling, leave, attendance, payroll */

export type HrRole = "manager" | "executive" | "employee";

export type HrDepartment = {
  id: string;
  name: string;
  headId?: string;
};

export type HrEmployee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: string;
  managerId?: string;
  joinDate: string;
  employmentType: "full_time" | "part_time" | "contract";
  branchId: string;
  active: boolean;
  role: HrRole;
  /** Links to CRM agent for lead-routing sync */
  crmAgentId?: string;
  salaryMonthly: number;
};

export type HrShiftSlot = {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  role: string;
};

export type LeaveType = "casual" | "sick" | "earned" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export type HrLeaveRequest = {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  requestedAt: string;
  resolvedAt?: string;
  approverId?: string;
  /** When approved, sync absence to CRM linked agent */
  syncCrmAbsence?: boolean;
};

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave";

export type HrAttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
};

export type PayrollStatus = "draft" | "processed" | "paid";

export type HrPayrollLine = {
  id: string;
  employeeId: string;
  period: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
};

export const HR_MANAGER_ID = "hr_mgr";

export const SEED_HR_DEPARTMENTS: HrDepartment[] = [
  { id: "dept_clinical", name: "Clinical Operations", headId: "emp_dr_head" },
  { id: "dept_crm", name: "Revenue & CRM", headId: "emp_crm_lead" },
  { id: "dept_pharmacy", name: "Pharmacy", headId: "emp_pharm_head" },
  { id: "dept_admin", name: "Administration", headId: "emp_admin_head" },
  { id: "dept_hr", name: "Human Resources", headId: "hr_mgr" },
];

export const SEED_HR_EMPLOYEES: HrEmployee[] = [
  {
    id: "hr_mgr",
    name: "HR Manager",
    email: "hr@navayu.in",
    phone: "+91 98765 90001",
    departmentId: "dept_hr",
    designation: "HR Manager",
    joinDate: "2024-01-15",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "manager",
    salaryMonthly: 85000,
  },
  {
    id: "emp_hr_exec",
    name: "Kavita Nair",
    email: "kavita.hr@navayu.in",
    phone: "+91 98765 90002",
    departmentId: "dept_hr",
    designation: "HR Executive",
    managerId: "hr_mgr",
    joinDate: "2024-06-01",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "executive",
    salaryMonthly: 45000,
  },
  {
    id: "emp_crm_lead",
    name: "Priya Sharma",
    email: "priya@navayu.in",
    phone: "+91 98765 90010",
    departmentId: "dept_crm",
    designation: "Senior Counsellor",
    managerId: "hr_mgr",
    joinDate: "2023-03-10",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    crmAgentId: "ag_priya",
    salaryMonthly: 55000,
  },
  {
    id: "emp_crm_2",
    name: "Anita Desai",
    email: "anita@navayu.in",
    phone: "+91 98765 90011",
    departmentId: "dept_crm",
    designation: "Counsellor",
    managerId: "emp_crm_lead",
    joinDate: "2024-02-01",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    crmAgentId: "ag_anita",
    salaryMonthly: 48000,
  },
  {
    id: "emp_crm_3",
    name: "Rahul Verma",
    email: "rahul@navayu.in",
    phone: "+91 98765 90012",
    departmentId: "dept_crm",
    designation: "Caller / SDR",
    managerId: "emp_crm_lead",
    joinDate: "2024-08-15",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    crmAgentId: "ag_rahul",
    salaryMonthly: 35000,
  },
  {
    id: "emp_pharm_head",
    name: "Pharmacy Manager",
    email: "pharmacy@navayu.in",
    phone: "+91 98765 90020",
    departmentId: "dept_pharmacy",
    designation: "Chief Pharmacist",
    managerId: "hr_mgr",
    joinDate: "2022-11-01",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    salaryMonthly: 65000,
  },
  {
    id: "emp_dr_head",
    name: "Dr. Rajesh Mehta",
    email: "dr.mehta@navayu.in",
    phone: "+91 98765 90030",
    departmentId: "dept_clinical",
    designation: "Consultant — Spine",
    managerId: "hr_mgr",
    joinDate: "2021-05-01",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    salaryMonthly: 180000,
  },
  {
    id: "emp_admin_head",
    name: "Admin Lead",
    email: "admin@navayu.in",
    phone: "+91 98765 90040",
    departmentId: "dept_admin",
    designation: "Operations Admin",
    managerId: "hr_mgr",
    joinDate: "2023-01-10",
    employmentType: "full_time",
    branchId: "branch_gurgaon",
    active: true,
    role: "employee",
    salaryMonthly: 52000,
  },
];

/** Offset days from today — keeps demo data fresh */
export function relHrDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function hrPeriodYm(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_LEAVE_ENTITLEMENT = { casual: 12, sick: 10, earned: 15 } as const;

export const CRM_AGENT_OPTIONS = [
  { id: "ag_priya", label: "Priya Sharma (CRM)" },
  { id: "ag_anita", label: "Anita Desai (CRM)" },
  { id: "ag_rahul", label: "Rahul Verma (CRM)" },
] as const;

export function buildSeedShifts(): HrShiftSlot[] {
  const today = relHrDate(0);
  const yesterday = relHrDate(-1);
  return [
    { id: "sh_1", employeeId: "emp_crm_lead", date: today, startTime: "09:00", endTime: "18:00", location: "Gurgaon OPD", role: "Counsellor" },
    { id: "sh_2", employeeId: "emp_crm_2", date: today, startTime: "10:00", endTime: "19:00", location: "Gurgaon OPD", role: "Counsellor" },
    { id: "sh_3", employeeId: "emp_crm_3", date: today, startTime: "09:30", endTime: "18:30", location: "Gurgaon OPD", role: "Caller" },
    { id: "sh_4", employeeId: "emp_pharm_head", date: today, startTime: "08:00", endTime: "17:00", location: "Pharmacy", role: "Pharmacist" },
    { id: "sh_5", employeeId: "emp_dr_head", date: yesterday, startTime: "09:00", endTime: "14:00", location: "Consultation", role: "Consultant" },
  ];
}

export function buildSeedLeave(): HrLeaveRequest[] {
  return [
    {
      id: "lv_1",
      employeeId: "emp_crm_3",
      type: "casual",
      fromDate: relHrDate(1),
      toDate: relHrDate(2),
      reason: "Family function",
      status: "pending",
      requestedAt: new Date().toISOString(),
      syncCrmAbsence: true,
    },
    {
      id: "lv_2",
      employeeId: "emp_crm_2",
      type: "sick",
      fromDate: relHrDate(-8),
      toDate: relHrDate(-8),
      reason: "Fever",
      status: "approved",
      requestedAt: relHrDate(-9) + "T18:00:00",
      resolvedAt: relHrDate(-9) + "T20:00:00",
      approverId: "hr_mgr",
      syncCrmAbsence: true,
    },
  ];
}

export function buildSeedAttendance(): HrAttendanceRecord[] {
  const today = relHrDate(0);
  const yesterday = relHrDate(-1);
  return [
    { id: "att_1", employeeId: "emp_crm_lead", date: today, checkIn: "08:55", checkOut: "18:10", status: "present" },
    { id: "att_2", employeeId: "emp_crm_2", date: today, checkIn: "10:12", status: "late" },
    { id: "att_3", employeeId: "emp_pharm_head", date: today, checkIn: "07:58", checkOut: "17:02", status: "present" },
    { id: "att_4", employeeId: "emp_crm_lead", date: yesterday, checkIn: "09:00", checkOut: "18:00", status: "present" },
    { id: "att_5", employeeId: "emp_crm_2", date: yesterday, checkIn: "10:05", checkOut: "19:00", status: "late" },
  ];
}

export function buildSeedPayroll(): HrPayrollLine[] {
  const lastMonth = hrPeriodYm(-1);
  const thisMonth = hrPeriodYm(0);
  return [
    { id: "pay_1", employeeId: "emp_crm_lead", period: lastMonth, basic: 45000, allowances: 8000, deductions: 3200, net: 49800, status: "paid" },
    { id: "pay_2", employeeId: "emp_crm_2", period: lastMonth, basic: 38000, allowances: 7000, deductions: 2800, net: 42200, status: "paid" },
    { id: "pay_3", employeeId: "emp_crm_3", period: lastMonth, basic: 28000, allowances: 5000, deductions: 2100, net: 30900, status: "paid" },
    { id: "pay_4", employeeId: "emp_crm_lead", period: thisMonth, basic: 45000, allowances: 8000, deductions: 3200, net: 49800, status: "draft" },
    { id: "pay_5", employeeId: "emp_crm_2", period: thisMonth, basic: 38000, allowances: 7000, deductions: 2800, net: 42200, status: "draft" },
  ];
}

export const SEED_HR_SHIFTS = buildSeedShifts();
export const SEED_HR_LEAVE = buildSeedLeave();
export const SEED_HR_ATTENDANCE = buildSeedAttendance();
export const SEED_HR_PAYROLL = buildSeedPayroll();

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  earned: "Earned",
  unpaid: "Unpaid",
};
