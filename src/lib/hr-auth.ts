import { HR_MANAGER_ID, SEED_HR_EMPLOYEES, type HrEmployee } from "@/design-system/hr-data";

export const HR_MANAGER_EMAIL = "hr@navayu.in";
export const HR_MANAGER_PASSWORD = "hr2026";

export const SEED_HR_PASSWORDS: Record<string, string> = {
  hr_mgr: "hr2026",
  emp_hr_exec: "kavita2026",
};

const STORAGE_KEY = "candela-hr-v1";

export type HrLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

export function loadHrAuthSnapshot(): { employees: HrEmployee[]; passwords: Record<string, string> } {
  const employees = structuredClone(SEED_HR_EMPLOYEES);
  const passwords = { ...SEED_HR_PASSWORDS };
  if (typeof window === "undefined") return { employees, passwords };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { employees?: HrEmployee[]; passwords?: Record<string, string> };
      if (parsed.employees?.length) {
        return { employees: parsed.employees, passwords: parsed.passwords ?? passwords };
      }
    }
  } catch {
    /* seed */
  }
  return { employees, passwords };
}

export function validateHrLogin(
  email: string,
  password: string,
  employees: HrEmployee[],
  passwords: Record<string, string>,
): HrLoginResult {
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  if (normalized === HR_MANAGER_EMAIL.toLowerCase()) {
    if (pwd !== HR_MANAGER_PASSWORD) return { ok: false, error: "Incorrect manager password." };
    const mgr = employees.find((e) => e.id === HR_MANAGER_ID);
    return { ok: true, operatorId: HR_MANAGER_ID, name: mgr?.name ?? "HR Manager", email: HR_MANAGER_EMAIL };
  }

  const emp = employees.find((e) => e.email.toLowerCase() === normalized && e.role !== "manager");
  if (!emp) return { ok: false, error: "No HR account for this email." };
  if (!emp.active) return { ok: false, error: "Account inactive." };
  if (pwd !== (passwords[emp.id] ?? "welcome123")) return { ok: false, error: "Incorrect password." };

  return { ok: true, operatorId: emp.id, name: emp.name, email: emp.email };
}
