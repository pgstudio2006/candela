"use client";

import {
  PHARMACY_MANAGER_ID,
  type Drug,
  type PharmacyBill,
  type PharmacyStaff,
  type PoLine,
  type Prescription,
  type PurchaseOrder,
  type Supplier,
} from "@/design-system/pharmacy-data";
import {
  addDrugAction,
  addSupplierAction,
  adjustStockAction,
  approveReturnAction,
  createPOAction,
  dispensePrescriptionAction,
  fulfillIndentAction,
  getPharmacySnapshotAction,
  markBillPaidAction,
  quarantineBatchAction,
  receivePOAction,
  rejectPrescriptionAction,
  restockReturnAction,
  updateDrugAction,
  updatePOStatusAction,
  updateSupplierAction,
  verifyPrescriptionAction,
} from "@/server/pharmacy/actions";
import type { PharmacySnapshot } from "@/server/pharmacy/index";
import { useSession } from "@/components/candela/session-provider";
import { parseActionError } from "@/lib/action-errors";
import { getFilteredPrescriptions } from "@/lib/pharmacy-state-mutations";
import { computePharmacyKpis } from "@/lib/pharmacy-platform";
import { isTransientSessionError, sleep } from "@/lib/session-retry";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Store = PharmacySnapshot & {
  ready: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  isManager: () => boolean;
  isPurchase: () => boolean;
  getOperator: () => PharmacyStaff | undefined;
  getStaffRole: () => "manager" | "opd" | "purchase";
  getKpis: () => ReturnType<typeof computePharmacyKpis>;
  getDrug: (id: string) => Drug | undefined;
  getActivePrescriptions: () => Prescription[];
  verifyPrescription: (id: string, counselingNotes?: string) => Promise<void>;
  rejectPrescription: (id: string, reason: string) => Promise<void>;
  dispensePrescription: (
    id: string,
    quantities: Record<string, number>,
    witnessName?: string,
  ) => Promise<{ ok: boolean; error?: string; billId?: string }>;
  addDrug: (drug: Omit<Drug, "id">) => Promise<void>;
  updateDrug: (id: string, patch: Partial<Drug>) => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id">) => Promise<void>;
  updateSupplier: (id: string, patch: Partial<Supplier>) => Promise<void>;
  createPO: (supplierId: string, lines: PoLine[], notes?: string) => Promise<void>;
  updatePOStatus: (id: string, status: PurchaseOrder["status"]) => Promise<void>;
  receivePO: (poId: string, received: Record<string, { qty: number; batchNo: string; expiry: string }>) => Promise<void>;
  adjustStock: (batchId: string, delta: number, reason: string) => Promise<void>;
  quarantineBatch: (batchId: string, quarantined: boolean) => Promise<void>;
  markBillPaid: (id: string, mode: PharmacyBill["paymentMode"]) => Promise<void>;
  approveReturn: (id: string) => Promise<void>;
  restockReturn: (id: string) => Promise<void>;
  fulfillIndent: (id: string, qty: number) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

function requireOperatorId(operatorId: string) {
  if (!operatorId) throw new Error("Pharmacy operator not selected. Return to workspace login.");
  return operatorId;
}

export function PharmacyStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const operatorId = session?.pharmacyOperatorId ?? "";
  const [state, setState] = useState<PharmacySnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!operatorId) return;
      const silent = opts?.silent ?? false;
      if (!silent) setReady(false);
      try {
        const result = await getPharmacySnapshotAction(operatorId);
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
    },
    [operatorId],
  );

  useEffect(() => {
    if (!authReady || !session?.pharmacyOperatorId) return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      if (cancelled) return;
      try {
        const result = await getPharmacySnapshotAction(session.pharmacyOperatorId!);
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
  }, [authReady, session?.pharmacyOperatorId]);

  const value = useMemo<Store>(() => {
    const data = state ?? {
      staff: [],
      staffPasswords: {},
      drugs: [],
      stock: [],
      suppliers: [],
      purchaseOrders: [],
      prescriptions: [],
      bills: [],
      returns: [],
      indents: [],
      scheduleH: [],
      activities: [],
      operatorId: "",
      activeOperatorId: operatorId,
      activeOperatorName: "Pharmacist",
      activeOperatorRole: "opd" as const,
    };

    const getOperator = () => data.staff.find((s) => s.id === data.activeOperatorId);
    const getStaffRole = (): "manager" | "opd" | "purchase" => {
      if (data.activeOperatorRole) return data.activeOperatorRole;
      const op = getOperator();
      if (!op) return "opd";
      if (op.id === PHARMACY_MANAGER_ID || op.role === "manager") return "manager";
      return op.role;
    };

    const opId = () => requireOperatorId(data.activeOperatorId || operatorId);

    return {
      ...data,
      ready,
      error,
      refresh,
      isManager: () => getStaffRole() === "manager",
      isPurchase: () => getStaffRole() === "purchase",
      getOperator,
      getStaffRole,
      getKpis: () =>
        computePharmacyKpis(data.prescriptions, data.stock, data.drugs, data.bills, data.purchaseOrders),
      getDrug: (id) => data.drugs.find((d) => d.id === id),
      getActivePrescriptions: () =>
        getFilteredPrescriptions(
          data.prescriptions.filter((r) => !["dispensed", "cancelled", "rejected"].includes(r.status)),
        ),
      verifyPrescription: async (id, counselingNotes) => {
        await verifyPrescriptionAction(opId(), id, counselingNotes);
        await refresh({ silent: true });
      },
      rejectPrescription: async (id, reason) => {
        await rejectPrescriptionAction(opId(), id, reason);
        await refresh({ silent: true });
      },
      dispensePrescription: async (id, quantities, witnessName) => {
        try {
          const result = await dispensePrescriptionAction(opId(), id, quantities, witnessName);
          await refresh({ silent: true });
          return { ok: true, billId: result.billId };
        } catch (err) {
          return { ok: false, error: parseActionError(err).message };
        }
      },
      addDrug: async (drug) => {
        await addDrugAction(opId(), drug);
        await refresh({ silent: true });
      },
      updateDrug: async (id, patch) => {
        await updateDrugAction(opId(), id, patch);
        await refresh({ silent: true });
      },
      addSupplier: async (s) => {
        await addSupplierAction(opId(), s);
        await refresh({ silent: true });
      },
      updateSupplier: async (id, patch) => {
        await updateSupplierAction(opId(), id, patch);
        await refresh({ silent: true });
      },
      createPO: async (supplierId, lines, notes) => {
        await createPOAction(opId(), supplierId, lines, notes);
        await refresh({ silent: true });
      },
      updatePOStatus: async (id, status) => {
        await updatePOStatusAction(opId(), id, status);
        await refresh({ silent: true });
      },
      receivePO: async (poId, received) => {
        await receivePOAction(opId(), poId, received);
        await refresh({ silent: true });
      },
      adjustStock: async (batchId, delta, reason) => {
        await adjustStockAction(opId(), batchId, delta, reason);
        await refresh({ silent: true });
      },
      quarantineBatch: async (batchId, quarantined) => {
        await quarantineBatchAction(opId(), batchId, quarantined);
        await refresh({ silent: true });
      },
      markBillPaid: async (id, mode) => {
        await markBillPaidAction(opId(), id, mode);
        await refresh({ silent: true });
      },
      approveReturn: async (id) => {
        await approveReturnAction(opId(), id);
        await refresh({ silent: true });
      },
      restockReturn: async (id) => {
        await restockReturnAction(opId(), id);
        await refresh({ silent: true });
      },
      fulfillIndent: async (id, qty) => {
        await fulfillIndentAction(opId(), id, qty);
        await refresh({ silent: true });
      },
    };
  }, [state, ready, error, refresh, operatorId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePharmacyStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePharmacyStore must be used within PharmacyStoreProvider");
  return ctx;
}

export { PHARMACY_MANAGER_ID };
