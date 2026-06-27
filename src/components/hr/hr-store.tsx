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
import { isTransientSessionError, sleep } from "@/lib/session-retry";
import type { HrSnapshot, HrSettings } from "@/server/hr/index";
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

type HrSnapshotResult = { ok: true; data: HrSnapshot } | { ok: false; code: string; error: string };

async function loadHrSnapshot(): Promise<HrSnapshotResult> {
  try {
    const res = await fetch("/api/hr/snapshot", { cache: "no-store" });
    if (res.ok) {
      return (await res.json()) as HrSnapshotResult;
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, code: "INTERNAL_ERROR", error: body?.error ?? "Failed to load HR workspace." };
  } catch {
    return { ok: false, code: "INTERNAL_ERROR", error: "Failed to load HR workspace." };
  }
}

async function hrMutate(body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch("/api/hr/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    return { ok: false, error: msg };
  }
}

export function HrStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [state, setState] = useState<HrSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const result = await loadHrSnapshot();
      if (result.ok) {
        setState(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
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
        const result = await loadHrSnapshot();
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
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
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

    const run = async (fn: () => Promise<{ ok: boolean; data?: any; error?: string }>) => {
      try {
        const res = await fn();
        if (!res.ok) throw new Error(res.error);
        if (res.data?.snapshot) setState(res.data.snapshot);
        else await refresh({ silent: true });
        setError(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candela-hr-updated"));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
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
        const res = await hrMutate({ op: "addEmployee", employee: e, password });
        if (!res.ok) throw new Error(res.error);
        if (res.data?.snapshot) setState(res.data.snapshot);
        setError(null);
        return res.data?.initialPassword;
      },
      setEmployeePassword: (employeeId, password) =>
        run(() => hrMutate({ op: "setEmployeePassword", employeeId, password })),
      updateEmployee: (id, patch) => run(() => hrMutate({ op: "updateEmployee", id, patch })),
      addLeaveRequest: (req) => run(() => hrMutate({ op: "addLeaveRequest", leaveReq: req })),
      cancelLeaveRequest: (id) => run(() => hrMutate({ op: "cancelLeaveRequest", id })),
      approveLeave: async (id, approved) => {
        try {
          const res = await hrMutate({ op: "approveLeave", id, approved });
          if (!res.ok) throw new Error(res.error);
          if (res.data?.snapshot) setState(res.data.snapshot);
          setError(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("candela-hr-updated"));
          }
          return { transferred: res.data?.transferred ?? 0 };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Something went wrong.";
          setError(msg);
          throw err;
        }
      },
      addShift: (shift) => run(() => hrMutate({ op: "addShift", shift })),
      updateShift: (id, patch) => run(() => hrMutate({ op: "updateShift", id, patch })),
      removeShift: (id) => run(() => hrMutate({ op: "removeShift", id })),
      copyPreviousWeek: (targetDate) =>
        run(() => hrMutate({ op: "copyShiftsFromPreviousWeek", targetDate })),
      markAttendance: (record) => run(() => hrMutate({ op: "markAttendance", attendance: record })),
      checkoutAttendance: (employeeId, date) =>
        run(() => hrMutate({ op: "checkoutAttendance", employeeId, date })),
      processPayroll: (period) => run(() => hrMutate({ op: "processPayroll", period })),
      markPayrollPaid: (period) => run(() => hrMutate({ op: "markPayrollPaid", period })),
      generatePayrollRun: async (period) => {
        try {
          const res = await hrMutate({ op: "generatePayrollRun", period });
          if (!res.ok) throw new Error(res.error);
          if (res.data?.snapshot) setState(res.data.snapshot);
          setError(null);
          return res.data?.created ?? 0;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Something went wrong.";
          setError(msg);
          throw err;
        }
      },
      updateSettings: (patch) => run(() => hrMutate({ op: "updateHrSettings", settingsPatch: patch })),
    };
  }, [state, ready, error, refresh, session?.hrOperatorId]);

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>;
}

export function useHrStore() {
  const ctx = useContext(HrContext);
  if (!ctx) throw new Error("useHrStore must be used within HrStoreProvider");
  return ctx;
}
