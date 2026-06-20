"use client";

import {
  type AdminPlatformSettings,
  type DepartmentConfig,
  type DiseaseCluster,
  type DiseaseMapNode,
  type ExpenseEntry,
  type MisReport,
  type MrdRequest,
  type RevenueSharePolicy,
  type StaffMember,
} from "@/design-system/admin-data";
import type { Patient, Visit } from "@/design-system/frontdesk-data";
import {
  computeCommandKpis,
  computeHawkEye,
  computeLeakageFlags,
  simulateRevenueShare,
} from "@/lib/admin-platform";
import type { DataMiningSnapshot } from "@/lib/admin-analytics";
import { parseActionError } from "@/lib/action-errors";
import { isTransientSessionError, sleep } from "@/lib/session-retry";
import {
  addDepartment as addDepartmentAction,
  addDiseaseNode as addDiseaseNodeAction,
  addExpense as addExpenseAction,
  addMrdRequest as addMrdRequestAction,
  addRevenuePolicy as addRevenuePolicyAction,
  addStaff as addStaffAction,
  approveExpense as approveExpenseAction,
  exportRevenueShareCsvAction,
  getAdminSnapshot,
  logAdminAction as logAdminActionMutation,
  removeDepartment as removeDepartmentAction,
  removeDiseaseNode as removeDiseaseNodeAction,
  removeStaff as removeStaffAction,
  resolveLeakageFlag as resolveLeakageFlagAction,
  runMisReport as runMisReportAction,
  updateAdminSettings as updateAdminSettingsAction,
  updateDepartment as updateDepartmentAction,
  updateDiseaseNode as updateDiseaseNodeAction,
  updateMrdStatus as updateMrdStatusAction,
  updateRevenuePolicy as updateRevenuePolicyAction,
  updateStaff as updateStaffAction,
  type AdminSnapshot,
} from "@/server/admin/actions";
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

type AdminStoreValue = Omit<
  AdminSnapshot,
  "patients" | "visits"
> & {
  ready: boolean;
  error: string | null;
  patients: Patient[];
  visits: Visit[];
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  getAuditLog: () => AdminSnapshot["auditEvents"];
  getCommandKpis: () => ReturnType<typeof computeCommandKpis>;
  getHawkEye: () => ReturnType<typeof computeHawkEye>;
  getLeakageFlags: () => ReturnType<typeof computeLeakageFlags>;
  getActiveLeakageFlags: () => ReturnType<typeof computeLeakageFlags>;
  getPrevalence: () => DataMiningSnapshot["livePrevalence"];
  simulateShare: (policyId: string) => ReturnType<typeof simulateRevenueShare>;
  updateStaff: (id: string, patch: Partial<StaffMember>) => Promise<void>;
  addStaff: (member: Omit<StaffMember, "id">) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  updateDepartment: (id: string, patch: Partial<DepartmentConfig>) => Promise<void>;
  addDepartment: (dept: Omit<DepartmentConfig, "id">) => Promise<void>;
  removeDepartment: (id: string) => Promise<void>;
  updateDiseaseNode: (id: string, patch: Partial<DiseaseMapNode>) => Promise<void>;
  addDiseaseNode: (node: Omit<DiseaseMapNode, "id">) => Promise<void>;
  removeDiseaseNode: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AdminPlatformSettings>) => Promise<void>;
  resolveLeakageFlag: (id: string) => Promise<void>;
  addExpense: (entry: Omit<ExpenseEntry, "id">) => Promise<void>;
  approveExpense: (id: string, approved: boolean) => Promise<void>;
  updateRevenuePolicy: (id: string, patch: Partial<RevenueSharePolicy>) => Promise<void>;
  addRevenuePolicy: (policy: Omit<RevenueSharePolicy, "id">) => Promise<void>;
  updateMrdStatus: (id: string, status: MrdRequest["status"]) => Promise<void>;
  addMrdRequest: (req: Omit<MrdRequest, "id" | "requestedAt" | "status">) => Promise<void>;
  runMisReport: (id: string) => Promise<{ csv: string; filename: string }>;
  exportRevenueShare: (
    policyId: string,
    doctorName: string,
    gross: number,
    share: number,
    packagesClosed: number,
  ) => Promise<{ csv: string; filename: string }>;
  logAdminAction: (summary: string) => Promise<void>;
};

const AdminContext = createContext<AdminStoreValue | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [state, setState] = useState<AdminSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const snapshot = await getAdminSnapshot();
      setState(snapshot);
      setError(null);
    } catch (err) {
      setError(parseActionError(err).message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || session?.role !== "admin") return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      if (cancelled) return;
      try {
        const snapshot = await getAdminSnapshot();
        if (cancelled) return;
        setState(snapshot);
        setError(null);
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
  }, [authReady, session?.role]);

  const run = useCallback(
    async (fn: () => Promise<AdminSnapshot>) => {
      try {
        const snapshot = await fn();
        setState(snapshot);
        setError(null);
      } catch (err) {
        setError(parseActionError(err).message);
        throw err;
      }
    },
    [],
  );

  const value = useMemo<AdminStoreValue>(() => {
    const data = state ?? {
      staff: [] as StaffMember[],
      departments: [] as DepartmentConfig[],
      diseaseMap: [] as DiseaseMapNode[],
      diseaseClusters: [] as DiseaseCluster[],
      geo: [],
      expenses: [],
      revenuePolicies: [],
      mrdRequests: [],
      misReports: [],
      settings: {
        kAnonymityMin: 5,
        geoAggregateOnly: true,
        auditRetentionYears: 7,
        outbreakAlerts: true,
        autoMisDaily: true,
        whatsappConsentFlag: false,
      },
      resolvedLeakageIds: [],
      auditEvents: [],
      patients: [],
      visits: [],
      dataMining: {
        kpis: [],
        prevalenceBars: [],
        ageGender: [],
        treatmentOutcomes: [],
        livePrevalence: [],
        dataSources: [],
      },
      documentTemplates: [],
      activeOperatorId: "",
      activeOperatorName: "Admin",
      activeOperatorRole: "super_admin",
      isSuperAdmin: true,
      canManageConfig: true,
      canManageFinance: true,
      isViewer: false,
      branchId: session?.branchId ?? "",
    };

    const { patients, visits, ...admin } = data;

    return {
      ...admin,
      ready,
      error,
      patients,
      visits,
      refresh,
      getAuditLog: () => data.auditEvents,
      getCommandKpis: () =>
        computeCommandKpis(visits, data.staff, data.mrdRequests, patients, data.auditEvents.length),
      getHawkEye: () => computeHawkEye(visits),
      getLeakageFlags: () => computeLeakageFlags(visits, patients),
      getActiveLeakageFlags: () =>
        computeLeakageFlags(visits, patients).filter((f) => !data.resolvedLeakageIds.includes(f.id)),
      getPrevalence: () => data.dataMining.livePrevalence,
      simulateShare: (policyId) => {
        const policy = data.revenuePolicies.find((p) => p.id === policyId)!;
        const doctorId = policy.doctorId ?? "dr_1";
        const name =
          doctorId === "dr_1"
            ? "Dr. Rajesh Mehta"
            : doctorId === "dr_2"
              ? "Dr. Priya Nair"
              : "Dr. Anil Verma";
        return simulateRevenueShare(doctorId, name, policy, visits);
      },
      updateStaff: (id, patch) => run(() => updateStaffAction(id, patch)),
      addStaff: (member) => run(() => addStaffAction(member)),
      removeStaff: (id) => run(() => removeStaffAction(id)),
      updateDepartment: (id, patch) => run(() => updateDepartmentAction(id, patch)),
      addDepartment: (dept) => run(() => addDepartmentAction(dept)),
      removeDepartment: (id) => run(() => removeDepartmentAction(id)),
      updateDiseaseNode: (id, patch) => run(() => updateDiseaseNodeAction(id, patch)),
      addDiseaseNode: (node) => run(() => addDiseaseNodeAction(node)),
      removeDiseaseNode: (id) => run(() => removeDiseaseNodeAction(id)),
      updateSettings: (patch) => run(() => updateAdminSettingsAction(patch)),
      resolveLeakageFlag: (id) => run(() => resolveLeakageFlagAction(id)),
      addExpense: (entry) => run(() => addExpenseAction(entry)),
      approveExpense: (id, approved) => run(() => approveExpenseAction(id, approved)),
      updateRevenuePolicy: (id, patch) => run(() => updateRevenuePolicyAction(id, patch)),
      addRevenuePolicy: (policy) => run(() => addRevenuePolicyAction(policy)),
      updateMrdStatus: (id, status) => run(() => updateMrdStatusAction(id, status)),
      addMrdRequest: (req) => run(() => addMrdRequestAction(req)),
      runMisReport: async (id) => {
        try {
          const { snapshot, csv, filename } = await runMisReportAction(id);
          setState(snapshot);
          setError(null);
          return { csv, filename };
        } catch (err) {
          setError(parseActionError(err).message);
          throw err;
        }
      },
      exportRevenueShare: (policyId, doctorName, gross, share, packagesClosed) =>
        exportRevenueShareCsvAction(policyId, doctorName, gross, share, packagesClosed),
      logAdminAction: (summary) => run(() => logAdminActionMutation(summary)),
    };
  }, [state, ready, error, refresh, run, session?.branchId]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
