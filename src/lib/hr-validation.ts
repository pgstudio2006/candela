import { z } from "zod";
import { ServerActionError } from "@/server/errors";

export const employeeInputSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(120),
  phone: z.string().max(20).optional(),
  departmentId: z.string().min(1),
  designation: z.string().min(1).max(80),
  managerId: z.string().optional(),
  joinDate: z.string().min(1),
  employmentType: z.enum(["full_time", "part_time", "contract"]),
  branchId: z.string().min(1),
  active: z.boolean(),
  role: z.string().min(1),
  crmAgentId: z.string().optional(),
  salaryMonthly: z.number().min(0).max(10_000_000),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["casual", "sick", "earned", "unpaid"]),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().min(2).max(500),
  syncCrmAbsence: z.boolean().optional(),
});

export const shiftInputSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(1).max(120),
  role: z.string().min(1).max(80),
});

export const attendanceInputSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(["present", "late", "absent", "half_day", "on_leave"]),
  notes: z.string().max(500).optional(),
});

export function validateEmployeeInput(input: unknown) {
  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid employee data.");
  }
  return parsed.data;
}

export function validateLeaveRequestInput(input: unknown) {
  const parsed = leaveRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid leave request.");
  }
  return parsed.data;
}

export function validateShiftInput(input: unknown) {
  const parsed = shiftInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid shift data.");
  }
  return parsed.data;
}

export function validatePassword(password: string) {
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    throw new ServerActionError("VALIDATION", "Password must be at least 6 characters.");
  }
  return trimmed;
}
