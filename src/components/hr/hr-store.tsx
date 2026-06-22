"use client";

import {
  type HrAttendanceRecord,
  type HrDepartment,
  type HrEmployee,
  type HrLeaveRequest,
  type HrPayrollLine,
  type HrShiftSlot,
} from "@/design-system/hr-data";
import { computeHrKpis } from "@/lib/hr-platform";
import { parseActionError } from "@/lib/action-errors";
import { isTransientSessionError, sleep } from "@/lib/session-retry";
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
  setEmployeePasswordAction,
  updateEmployee as updateEmployeeAction,
  updateHrSettings as updateHrSettingsAction,
  updateShift as updateShiftAction,
  type HrSnapshot,
} from "@/server/hr/actions";
import { useSession } from "@/components/candela/session-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export { HR_MANAGER_ID } from "@/design-system/hr-data";

type HrStoreValue = Omit<HrSnapshot, "isManager"> & {
  ready: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  isManager: () => boolean;
  getOperator: () => HrEmployee | undefined;
  getEmployee: (id: string) => HrEmployee | undefined;
  getHrKpis: () => ReturnType<typeof computeHrKpis>;
  addEmployee: (e: Omit<HrEmployee, "id">, password?: string) => Promise<string | undefined>;
  setEmployeePassword: (employeeId: string, password: string) => Promise<void>;
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
  updateSettings: (patch: Partial<HrSnapshot["settings"]>) => Promise<void>;
};

const HrContext = createContext<HrStoreValue | null>(null);

export function HrStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [state, setState] = useState<HrSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const result = await getHrSnapshot();
      if (result.ok) {
        setState(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(parseActionError(err).message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || session?.role !== "hr" || !session.hrOperatorId) return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      if (cancelled) return;
      try {
        const result = await getHrSnapshot();
        if (cancelled) return;
        if (result.ok) {
          setState(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 2 && isTransientSessionError(err)) {
          await sleep(400 * (attempt + 1));
          await load(attempt + 1);
          return;
        }
        setError(parseActionError(err).message);
        setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady, session?.hrOperatorId, session?.role]);

  const value = useMemo<HrStoreValue>(() => {
    const data = state ?? {
      employees: [],
      departments: [] as HrDepartment[],
      shifts: [],
      leaveRequests: [],
      attendance: [],
      payroll: [],
      operatorId: "",
      activeOperatorId: session?.hrOperatorId ?? "",
      activeOperatorName: "HR",
      isManager: false,
      crmAgents: [],
      settings: {
        autoCrmSync: true,
        leaveApprovalNotify: true,
        attendanceReminder: false,
      },
    };

    const isManager = () => data.isManager;
    const getOperator = () => data.employees.find((e) => e.id === data.activeOperatorId);
    const getEmployee = (id: string) => data.employees.find((e) => e.id === id);
    const operatorId = data.activeOperatorId;

    const run = async (fn: () => Promise<HrSnapshot>) => {
      try {
        const next = await fn();
        setState(next);
        setError(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candela-hr-updated"));
        }
      } catch (err) {
        setError(parseActionError(err).message);
        throw err;
      }
    };

    return {
      ...data,
      ready,
      error,
      refresh,
      isManager,
      getOperator,
      getEmployee,
      getHrKpis: () =>
        computeHrKpis(data.employees, data.leaveRequests, data.attendance, data.payroll),
      addEmployee: async (e, password) => {
        const result = await addEmployeeAction(e, operatorId, password);
        setState(result.snapshot);
        setError(null);
        return result.initialPassword;
      },
      setEmployeePassword: (employeeId, password) =>
        run(() => setEmployeePasswordAction(employeeId, password, operatorId)),
      updateEmployee: (id, patch) => run(() => updateEmployeeAction(id, patch, operatorId)),
      addLeaveRequest: (req) => run(() => addLeaveRequestAction(req, operatorId)),
      cancelLeaveRequest: (id) => run(() => cancelLeaveRequestAction(id, operatorId)),
      approveLeave: async (id, approved) => {
        try {
          const { snapshot, transferred } = await approveLeaveAction(id, approved, operatorId);
          setState(snapshot);
          setError(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("candela-hr-updated"));
          }
          return { transferred };
        } catch (err) {
          setError(parseActionError(err).message);
          throw err;
        }
      },
      addShift: (shift) => run(() => addShiftAction(shift, operatorId)),
      updateShift: (id, patch) => run(() => updateShiftAction(id, patch, operatorId)),
      removeShift: (id) => run(() => removeShiftAction(id, operatorId)),
      copyPreviousWeek: (targetDate) =>
        run(() => copyShiftsFromPreviousWeekAction(targetDate, operatorId)),
      markAttendance: (record) => run(() => markAttendanceAction(record, operatorId)),
      checkoutAttendance: (employeeId, date) =>
        run(() => checkoutAttendanceAction(employeeId, date, operatorId)),
      processPayroll: (period) => run(() => processPayrollAction(period, operatorId)),
      markPayrollPaid: (period) => run(() => markPayrollPaidAction(period, operatorId)),
      generatePayrollRun: async (period) => {
        try {
          const { snapshot, created } = await generatePayrollRunAction(period, operatorId);
          setState(snapshot);
          setError(null);
          return created;
        } catch (err) {
          setError(parseActionError(err).message);
          throw err;
        }
      },
      updateSettings: (patch) => run(() => updateHrSettingsAction(patch, operatorId)),
    };
  }, [state, ready, error, refresh, session?.hrOperatorId]);

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>;
}

export function useHrStore() {
  const ctx = useContext(HrContext);
  if (!ctx) throw new Error("useHrStore must be used within HrStoreProvider");
  return ctx;
}
