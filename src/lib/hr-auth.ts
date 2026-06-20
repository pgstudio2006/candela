import { HR_MANAGER_ID } from "@/design-system/hr-data";

export const HR_MANAGER_EMAIL = "hr@navayu.in";
export const HR_MANAGER_PASSWORD = "hr2026";

export const SEED_HR_PASSWORDS: Record<string, string> = {
  hr_mgr: "hr2026",
  emp_hr_exec: "kavita2026",
};

export { HR_MANAGER_ID };

export function isHrManagerEmployee(employee: { id: string; role: string }) {
  return employee.id === HR_MANAGER_ID || employee.role === "manager";
}

export function generateEmployeePassword(): string {
  return `welcome${Math.floor(1000 + Math.random() * 9000)}`;
}
