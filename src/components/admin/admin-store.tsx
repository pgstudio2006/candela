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
  computePrevalence,
  simulateRevenueShare,
} from "@/lib/admin-platform";
import {
  addDepartment as addDepartmentAction,
  addDiseaseNode as addDiseaseNodeAction,
  addExpense as addExpenseAction,
  addMrdRequest as addMrdRequestAction,
  addRevenuePolicy as addRevenuePolicyAction,
  addStaff as addStaffAction,
  approveExpense as approveExpenseAction,
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
} from "@/server/admin/actions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminState = {
  staff: StaffMember[];
  departments: DepartmentConfig[];
  diseaseMap: DiseaseMapNode[];
  diseaseClusters: DiseaseCluster[];
  geo: {
    id: string;
    pincode: string;
    city: string;
    lat: number;
    lng: number;
    patientCount: number;
    opdCount: number;
    ipdCount: number;
    revenue: number;
    topDiagnosis: string;
    severity?: "high" | "medium" | "low";
  }[];
  expenses: ExpenseEntry[];
  revenuePolicies: RevenueSharePolicy[];
  mrdRequests: MrdRequest[];
  misReports: MisReport[];
  settings: AdminPlatformSettings;
  resolvedLeakageIds: string[];
  auditEvents: {
    id: string;
    at: string;
    actor: string;
    actorRole: string;
    module: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    severity: "info" | "warning" | "critical";
  }[];
};

type AdminStoreValue = AdminState & {
  ready: boolean;
  patients: Patient[];
  visits: Visit[];
  refresh: () => Promise<void>;
  getAuditLog: () => AdminState["auditEvents"];
  getCommandKpis: () => ReturnType<typeof computeCommandKpis>;
  getHawkEye: () => ReturnType<typeof computeHawkEye>;
  getLeakageFlags: () => ReturnType<typeof computeLeakageFlags>;
  getActiveLeakageFlags: () => ReturnType<typeof computeLeakageFlags>;
  getPrevalence: () => ReturnType<typeof computePrevalence>;
  simulateShare: (policyId: string) => ReturnType<typeof simulateRevenueShare>;
  updateSettings: (patch: Partial<AdminPlatformSettings>) => Promise<void>;
  resolveLeakageFlag: (id: string) => Promise<void>;
  updateStaff: (id: string, patch: Partial<StaffMember>) => Promise<void>;
  addStaff: (member: Omit<StaffMember, "id">) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  updateDepartment: (id: string, patch: Partial<DepartmentConfig>) => Promise<void>;
  addDepartment: (dept: Omit<DepartmentConfig, "id">) => Promise<void>;
  removeDepartment: (id: string) => Promise<void>;
  updateDiseaseNode: (id: string, patch: Partial<DiseaseMapNode>) => Promise<void>;
  addDiseaseNode: (node: Omit<DiseaseMapNode, "id">) => Promise<void>;
  removeDiseaseNode: (id: string) => Promise<void>;
  addExpense: (entry: Omit<ExpenseEntry, "id">) => Promise<void>;
  approveExpense: (id: string, approved: boolean) => Promise<void>;
  updateRevenuePolicy: (id: string, patch: Partial<RevenueSharePolicy>) => Promise<void>;
  addRevenuePolicy: (policy: Omit<RevenueSharePolicy, "id">) => Promise<void>;
  updateMrdStatus: (id: string, status: MrdRequest["status"]) => Promise<void>;
  addMrdRequest: (req: Omit<MrdRequest, "id" | "requestedAt" | "status">) => Promise<void>;
  runMisReport: (id: string) => Promise<void>;
  resetAdminData: () => Promise<void>;
  logAdminAction: (summary: string) => Promise<void>;
};

const AdminContext = createContext<AdminStoreValue | null>(null);

function emptyAdminState(): AdminState {
  return {
    staff: [],
    departments: [],
    diseaseMap: [],
    diseaseClusters: [],
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
  };
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminState>(emptyAdminState);
  const [core, setCore] = useState<{ patients: Patient[]; visits: Visit[] }>({
    patients: [],
    visits: [],
  });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await getAdminSnapshot();
    setAdmin({
      staff: snapshot.staff,
      departments: snapshot.departments,
      diseaseMap: snapshot.diseaseMap,
      diseaseClusters: snapshot.diseaseClusters,
      geo: snapshot.geo,
      expenses: snapshot.expenses,
      revenuePolicies: snapshot.revenuePolicies,
      mrdRequests: snapshot.mrdRequests,
      misReports: snapshot.misReports,
      settings: snapshot.settings,
      resolvedLeakageIds: snapshot.resolvedLeakageIds,
      auditEvents: snapshot.auditEvents,
    });
    setCore({
      patients: snapshot.patients,
      visits: snapshot.visits,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sync = useCallback(async (action: Promise<Awaited<ReturnType<typeof getAdminSnapshot>>>) => {
    const snapshot = await action;
    setAdmin({
      staff: snapshot.staff,
      departments: snapshot.departments,
      diseaseMap: snapshot.diseaseMap,
      diseaseClusters: snapshot.diseaseClusters,
      geo: snapshot.geo,
      expenses: snapshot.expenses,
      revenuePolicies: snapshot.revenuePolicies,
      mrdRequests: snapshot.mrdRequests,
      misReports: snapshot.misReports,
      settings: snapshot.settings,
      resolvedLeakageIds: snapshot.resolvedLeakageIds,
      auditEvents: snapshot.auditEvents,
    });
    setCore({
      patients: snapshot.patients,
      visits: snapshot.visits,
    });
  }, []);

  const value = useMemo<AdminStoreValue>(() => {
    const visits = core.visits;
    const patients = core.patients;

    return {
      ...admin,
      ready,
      patients,
      visits,
      refresh,
      getAuditLog: () => admin.auditEvents,
      getCommandKpis: () => computeCommandKpis(visits, admin.staff, admin.mrdRequests, patients, admin.auditEvents.length),
      getHawkEye: () => computeHawkEye(visits),
      getLeakageFlags: () => computeLeakageFlags(visits, patients),
      getActiveLeakageFlags: () =>
        computeLeakageFlags(visits, patients).filter((f) => !admin.resolvedLeakageIds.includes(f.id)),
      getPrevalence: () => computePrevalence(visits),
      simulateShare: (policyId) => {
        const policy = admin.revenuePolicies.find((p) => p.id === policyId)!;
        const doctorId = policy.doctorId ?? "dr_1";
        const name = doctorId === "dr_1" ? "Dr. Rajesh Mehta" : doctorId === "dr_2" ? "Dr. Priya Nair" : "Dr. Anil Verma";
        return simulateRevenueShare(doctorId, name, policy, visits);
      },
      updateStaff: async (id, patch) => sync(updateStaffAction(id, patch)),
      addStaff: async (member) => sync(addStaffAction(member)),
      removeStaff: async (id) => sync(removeStaffAction(id)),
      updateDepartment: async (id, patch) => sync(updateDepartmentAction(id, patch)),
      addDepartment: async (dept) => sync(addDepartmentAction(dept)),
      removeDepartment: async (id) => sync(removeDepartmentAction(id)),
      updateDiseaseNode: async (id, patch) => sync(updateDiseaseNodeAction(id, patch)),
      addDiseaseNode: async (node) => sync(addDiseaseNodeAction(node)),
      removeDiseaseNode: async (id) => sync(removeDiseaseNodeAction(id)),
      updateSettings: async (patch) => sync(updateAdminSettingsAction(patch)),
      resolveLeakageFlag: async (id) => sync(resolveLeakageFlagAction(id)),
      addExpense: async (entry) => sync(addExpenseAction(entry)),
      approveExpense: async (id, approved) => sync(approveExpenseAction(id, approved)),
      updateRevenuePolicy: async (id, patch) => sync(updateRevenuePolicyAction(id, patch)),
      addRevenuePolicy: async (policy) => sync(addRevenuePolicyAction(policy)),
      updateMrdStatus: async (id, status) => sync(updateMrdStatusAction(id, status)),
      addMrdRequest: async (req) => sync(addMrdRequestAction(req)),
      runMisReport: async (id) => sync(runMisReportAction(id)),
      resetAdminData: async () => refresh(),
      logAdminAction: async (summary) => sync(logAdminActionMutation(summary)),
    };
  }, [admin, core, ready, refresh, sync]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
