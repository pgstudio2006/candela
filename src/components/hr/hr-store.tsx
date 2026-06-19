"use client";

import {
  HR_MANAGER_ID,
  type HrAttendanceRecord,
  type HrDepartment,
  type HrEmployee,
  type HrLeaveRequest,
  type HrPayrollLine,
  type HrShiftSlot,
} from "@/design-system/hr-data";
import { computeHrKpis } from "@/lib/hr-platform";
import {
  addEmployee as addEmployeeAction,
  addLeaveRequest as addLeaveRequestAction,
  addShift as addShiftAction,
  approveLeave as approveLeaveAction,
  cancelLeaveRequest as cancelLeaveRequestAction,
  checkoutAttendance as checkoutAttendanceAction,
  generatePayrollRun as generatePayrollRunAction,
  getHrSnapshot,
  markAttendance as markAttendanceAction,
  markPayrollPaid as markPayrollPaidAction,
  processPayroll as processPayrollAction,
  removeShift as removeShiftAction,
  copyShiftsFromPreviousWeek as copyShiftsFromPreviousWeekAction,
  resetHrDemo,
  updateEmployee as updateEmployeeAction,
  updateHrSettings as updateHrSettingsAction,
  updateShift as updateShiftAction,
} from "@/server/hr/actions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SESSION_KEY = "candela-session";

export { HR_MANAGER_ID };

type HrState = {
  employees: HrEmployee[];
  departments: HrDepartment[];
  shifts: HrShiftSlot[];
  leaveRequests: HrLeaveRequest[];
  attendance: HrAttendanceRecord[];
  payroll: HrPayrollLine[];
  passwords?: Record<string, string>;
  operatorId: string;
  settings: {
    autoCrmSync: boolean;
    leaveApprovalNotify: boolean;
    attendanceReminder: boolean;
  };
};

type HrStoreValue = HrState & {
  ready: boolean;
  refresh: () => Promise<void>;
  isManager: () => boolean;
  getOperator: () => HrEmployee | undefined;
  getEmployee: (id: string) => HrEmployee | undefined;
  getHrKpis: () => ReturnType<typeof computeHrKpis>;
  addEmployee: (e: Omit<HrEmployee, "id">) => Promise<void>;
  updateEmployee: (id: string, patch: Partial<HrEmployee>) => Promise<void>;
  addLeaveRequest: (req: Omit<HrLeaveRequest, "id" | "status" | "requestedAt">) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  approveLeave: (id: string, approved: boolean) => Promise<{ transferred: number }>;
  addShift: (shift: Omit<HrShiftSlot, "id">) => Promise<void>;
  updateShift: (id: string, patch: Partial<HrShiftSlot>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  copyPreviousWeek: (targetDate: string) => Promise<void>;
  markAttendance: (record: Omit<HrAttendanceRecord, "id">) => Promise<void>;
  checkoutAttendance: (employeeId: string, date: string) => Promise<void>;
  processPayroll: (period: string) => Promise<void>;
  markPayrollPaid: (period: string) => Promise<void>;
  generatePayrollRun: (period: string) => Promise<number>;
  updateSettings: (patch: Partial<HrState["settings"]>) => Promise<void>;
  resetDemo: () => Promise<void>;
};

const HrContext = createContext<HrStoreValue | null>(null);

function operatorFromSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const s = JSON.parse(raw) as { role?: string; hrOperatorId?: string };
    if (s.role === "hr" && s.hrOperatorId) return s.hrOperatorId;
  } catch {
    /* ignore */
  }
  return "";
}

function emptyState(): HrState {
  return {
    employees: [],
    departments: [],
    shifts: [],
    leaveRequests: [],
    attendance: [],
    payroll: [],
    passwords: {},
    operatorId: "",
    settings: {
      autoCrmSync: true,
      leaveApprovalNotify: true,
      attendanceReminder: false,
    },
  };
}

export function HrStoreProvider({ children }: { children: ReactNode }) {
  const [hr, setHr] = useState<HrState>(emptyState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const operatorId = operatorFromSession();
    const next = await getHrSnapshot(operatorId);
    setHr(next);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<HrStoreValue>(() => {
    const isManager = () => hr.operatorId === HR_MANAGER_ID;
    const getOperator = () => hr.employees.find((e) => e.id === hr.operatorId);
    const getEmployee = (id: string) => hr.employees.find((e) => e.id === id);

    const operatorId = hr.operatorId;
    const withRefresh = async (action: Promise<HrState>) => {
      const next = await action;
      setHr(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-hr-updated"));
      }
    };

    return {
      ...hr,
      ready,
      refresh,
      isManager,
      getOperator,
      getEmployee,
      getHrKpis: () => computeHrKpis(hr.employees, hr.leaveRequests, hr.attendance, hr.payroll),
      addEmployee: async (e) => withRefresh(addEmployeeAction(e, operatorId)),
      updateEmployee: async (id, patch) =>
        withRefresh(updateEmployeeAction(id, patch, operatorId)),
      addLeaveRequest: async (req) =>
        withRefresh(addLeaveRequestAction(req, operatorId)),
      cancelLeaveRequest: async (id) =>
        withRefresh(cancelLeaveRequestAction(id, operatorId)),
      approveLeave: async (id, approved) => {
        const { snapshot, transferred } = await approveLeaveAction(id, approved, operatorId);
        setHr(snapshot);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candela-hr-updated"));
        }
        return { transferred };
      },
      addShift: async (shift) => withRefresh(addShiftAction(shift, operatorId)),
      updateShift: async (id, patch) =>
        withRefresh(updateShiftAction(id, patch, operatorId)),
      removeShift: async (id) => withRefresh(removeShiftAction(id, operatorId)),
      copyPreviousWeek: async (targetDate) =>
        withRefresh(copyShiftsFromPreviousWeekAction(targetDate, operatorId)),
      markAttendance: async (record) =>
        withRefresh(markAttendanceAction(record, operatorId)),
      checkoutAttendance: async (employeeId, date) =>
        withRefresh(checkoutAttendanceAction(employeeId, date, operatorId)),
      processPayroll: async (period) =>
        withRefresh(processPayrollAction(period, operatorId)),
      markPayrollPaid: async (period) =>
        withRefresh(markPayrollPaidAction(period, operatorId)),
      generatePayrollRun: async (period) => {
        const { snapshot, created } = await generatePayrollRunAction(period, operatorId);
        setHr(snapshot);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candela-hr-updated"));
        }
        return created;
      },
      updateSettings: async (patch) =>
        withRefresh(updateHrSettingsAction(patch, operatorId)),
      resetDemo: async () => withRefresh(resetHrDemo(operatorId)),
    };
  }, [hr, ready, refresh]);

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>;
}

export function useHrStore() {
  const ctx = useContext(HrContext);
  if (!ctx) throw new Error("useHrStore must be used within HrStoreProvider");
  return ctx;
}
