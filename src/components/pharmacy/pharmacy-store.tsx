"use client";

import {
  PHARMACY_MANAGER_ID,
  SEED_BILLS,
  SEED_DRUGS,
  SEED_INDENTS,
  SEED_PRESCRIPTIONS,
  SEED_PURCHASE_ORDERS,
  SEED_RETURNS,
  SEED_SCHEDULE_H,
  SEED_STOCK,
  SEED_SUPPLIERS,
  SEED_PHARMACY_STAFF,
  type Drug,
  type PharmacyActivity,
  type PharmacyBill,
  type PharmacyBillLine,
  type PharmacyStaff,
  type PoLine,
  type Prescription,
  type PurchaseOrder,
  type ReturnRecord,
  type ScheduleHEntry,
  type StockBatch,
  type Supplier,
  type WardIndent,
} from "@/design-system/pharmacy-data";
import {
  calcBillTotals,
  computePharmacyKpis,
  daysToExpiry,
  isControlledSchedule,
  pickFefoBatch,
} from "@/lib/pharmacy-platform";
import { parseActionError } from "@/lib/action-errors";
import { useSession } from "@/components/candela/session-provider";
import { savePharmacyStateAction, getPharmacyStateAction } from "@/server/pharmacy/actions";
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

export type PharmacyState = {
  staff: PharmacyStaff[];
  staffPasswords: Record<string, string>;
  drugs: Drug[];
  stock: StockBatch[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  prescriptions: Prescription[];
  bills: PharmacyBill[];
  returns: ReturnRecord[];
  indents: WardIndent[];
  scheduleH: ScheduleHEntry[];
  activities: PharmacyActivity[];
  operatorId: string;
};

function operatorFromSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const s = JSON.parse(raw) as { role?: string; pharmacyOperatorId?: string };
    if (s.role === "pharmacy" && s.pharmacyOperatorId) return s.pharmacyOperatorId;
  } catch {
    /* ignore */
  }
  return "";
}

function loadState(): PharmacyState {
  return {
    staff: structuredClone(SEED_PHARMACY_STAFF),
    staffPasswords: {},
    drugs: structuredClone(SEED_DRUGS),
    stock: structuredClone(SEED_STOCK),
    suppliers: structuredClone(SEED_SUPPLIERS),
    purchaseOrders: structuredClone(SEED_PURCHASE_ORDERS),
    prescriptions: structuredClone(SEED_PRESCRIPTIONS),
    bills: structuredClone(SEED_BILLS),
    returns: structuredClone(SEED_RETURNS),
    indents: structuredClone(SEED_INDENTS),
    scheduleH: structuredClone(SEED_SCHEDULE_H),
    activities: [],
    operatorId: operatorFromSession(),
  };
}

async function persist(state: PharmacyState) {
  const payload: PharmacyState = {
    ...state,
    operatorId: operatorFromSession() || state.operatorId || "",
  };
  await savePharmacyStateAction(payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-pharmacy-updated"));
  }
}

function logActivity(
  activities: PharmacyActivity[],
  actor: string,
  type: string,
  summary: string,
  refId?: string,
): PharmacyActivity[] {
  return [
    { id: `pha_${Date.now()}`, at: new Date().toISOString(), actor, type, summary, refId },
    ...activities,
  ].slice(0, 150);
}

type Store = PharmacyState & {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isManager: () => boolean;
  isPurchase: () => boolean;
  getOperator: () => PharmacyStaff | undefined;
  getStaffRole: () => "manager" | "opd" | "purchase";
  getKpis: () => ReturnType<typeof computePharmacyKpis>;
  getDrug: (id: string) => Drug | undefined;
  verifyPrescription: (id: string, counselingNotes?: string) => void;
  rejectPrescription: (id: string, reason: string) => void;
  dispensePrescription: (
    id: string,
    quantities: Record<string, number>,
    witnessName?: string,
  ) => { ok: boolean; error?: string; billId?: string };
  addDrug: (drug: Omit<Drug, "id">) => void;
  updateDrug: (id: string, patch: Partial<Drug>) => void;
  addSupplier: (s: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  createPO: (supplierId: string, lines: PoLine[], notes?: string) => void;
  updatePOStatus: (id: string, status: PurchaseOrder["status"]) => void;
  receivePO: (poId: string, received: Record<string, { qty: number; batchNo: string; expiry: string }>) => void;
  adjustStock: (batchId: string, delta: number, reason: string) => void;
  quarantineBatch: (batchId: string, quarantined: boolean) => void;
  createBill: (input: Omit<PharmacyBill, "id" | "createdAt">) => string;
  markBillPaid: (id: string, mode: PharmacyBill["paymentMode"]) => void;
  approveReturn: (id: string) => void;
  restockReturn: (id: string) => void;
  fulfillIndent: (id: string, qty: number) => void;
  addStaff: (s: Omit<PharmacyStaff, "id">, password?: string) => string;
};

const Ctx = createContext<Store | null>(null);

export function PharmacyStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [state, setState] = useState<PharmacyState>(loadState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false);
    try {
      const remote = await getPharmacyStateAction();
      const operatorId =
        (session?.role === "pharmacy" && session.pharmacyOperatorId) ||
        operatorFromSession() ||
        remote.operatorId ||
        "";
      setState({ ...remote, operatorId });
      setError(null);
    } catch (err) {
      setError(parseActionError(err).message);
    } finally {
      setReady(true);
    }
  }, [session?.pharmacyOperatorId, session?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sync = useCallback((fn: (p: PharmacyState) => PharmacyState) => {
    setState((prev) => {
      const next = fn(prev);
      void persist(next).catch((err) => {
        console.error("Pharmacy save failed:", err);
        setError(parseActionError(err).message);
      });
      return next;
    });
  }, []);

  const value = useMemo<Store>(() => {
    const getOperator = () => state.staff.find((s) => s.id === state.operatorId);
    const getStaffRole = (): "manager" | "opd" | "purchase" => {
      const op = getOperator();
      if (!op) return "opd";
      if (op.id === PHARMACY_MANAGER_ID || op.role === "manager") return "manager";
      return op.role;
    };
    const isManager = () => getStaffRole() === "manager";
    const isPurchase = () => getStaffRole() === "purchase";
    const actor = () => getOperator()?.name ?? "Pharmacist";

    return {
      ...state,
      ready,
      error,
      refresh,
      isManager,
      isPurchase,
      getOperator,
      getStaffRole,
      getKpis: () =>
        computePharmacyKpis(
          state.prescriptions,
          state.stock,
          state.drugs,
          state.bills,
          state.purchaseOrders,
        ),
      getDrug: (id) => state.drugs.find((d) => d.id === id),

      verifyPrescription: (id, counselingNotes) => {
        const now = new Date().toISOString();
        sync((prev) => ({
          ...prev,
          prescriptions: prev.prescriptions.map((r) =>
            r.id === id ? { ...r, status: "verified" as const, verifiedAt: now, updatedAt: now, counselingNotes } : r,
          ),
          activities: logActivity(prev.activities, actor(), "verify", `Verified Rx ${id}`, id),
        }));
      },

      rejectPrescription: (id, reason) => {
        const now = new Date().toISOString();
        sync((prev) => ({
          ...prev,
          prescriptions: prev.prescriptions.map((r) =>
            r.id === id ? { ...r, status: "rejected" as const, rejectReason: reason, updatedAt: now } : r,
          ),
          activities: logActivity(prev.activities, actor(), "reject", `Rejected Rx: ${reason}`, id),
        }));
      },

      dispensePrescription: (id, quantities, witnessName) => {
        const rx = state.prescriptions.find((r) => r.id === id);
        if (!rx || !["verified", "partially_dispensed"].includes(rx.status)) {
          return { ok: false, error: "Prescription must be verified before dispense." };
        }

        let stock = [...state.stock];
        const lines: PharmacyBillLine[] = [];
        let scheduleEntries = [...state.scheduleH];
        const updatedLines = rx.lines.map((line) => {
          const qty = quantities[line.id] ?? line.qtyPrescribed - line.qtyDispensed;
          if (qty <= 0) return line;
          const drugId = line.substituteDrugId ?? line.drugId;
          const drug = state.drugs.find((d) => d.id === drugId);
          const batch = pickFefoBatch(drugId, stock, qty);
          if (!batch) return line;
          if (daysToExpiry(batch.expiry) < 0) return line;

          stock = stock.map((s) =>
            s.id === batch.id ? { ...s, qtyOnHand: s.qtyOnHand - qty, reserved: Math.max(0, s.reserved - qty) } : s,
          );
          lines.push({ drugId, batchId: batch.id, qty, rate: batch.mrp, gstPercent: drug?.gstPercent ?? 12 });

          if (drug && isControlledSchedule(drug.schedule)) {
            const bal = (scheduleEntries.filter((e) => e.drugId === drugId).at(-1)?.balanceAfter ?? 0) + qty;
            scheduleEntries.push({
              id: `sh_${Date.now()}_${line.id}`,
              prescriptionId: id,
              patientName: rx.patientName,
              uhid: rx.uhid,
              doctorName: rx.doctorName,
              drugId,
              batchId: batch.id,
              qty,
              balanceAfter: bal,
              pharmacistId: state.operatorId,
              witnessName: drug.schedule === "H1" || drug.schedule === "X" ? witnessName : undefined,
              at: new Date().toISOString(),
            });
          }

          return { ...line, qtyDispensed: line.qtyDispensed + qty };
        });

        if (!lines.length) return { ok: false, error: "Insufficient stock or expired batch." };

        const allDone = updatedLines.every((l) => l.qtyDispensed >= l.qtyPrescribed);
        const partial = updatedLines.some((l) => l.qtyDispensed > 0 && l.qtyDispensed < l.qtyPrescribed);
        const newStatus = allDone ? "dispensed" : partial ? "partially_dispensed" : rx.status;
        const now = new Date().toISOString();
        const totals = calcBillTotals(lines);

        let billId = "";
        sync((prev) => {
          billId = `bill_${Date.now()}`;
          const bill: PharmacyBill = {
            id: billId,
            prescriptionId: id,
            patientName: rx.patientName,
            uhid: rx.uhid,
            lines,
            subtotal: totals.subtotal,
            gstTotal: totals.gstTotal,
            discount: 0,
            total: totals.total,
            paymentMode: "cash",
            paid: false,
            createdAt: now,
            createdBy: actor(),
          };
          return {
            ...prev,
            stock,
            scheduleH: scheduleEntries,
            prescriptions: prev.prescriptions.map((r) =>
              r.id === id
                ? { ...r, lines: updatedLines, status: newStatus, dispensedAt: allDone ? now : r.dispensedAt, updatedAt: now, witnessName }
                : r,
            ),
            bills: [bill, ...prev.bills],
            activities: logActivity(prev.activities, actor(), "dispense", `Dispensed ${rx.patientName} — ₹${totals.total.toFixed(0)}`, id),
          };
        });

        return { ok: true, billId };
      },

      addDrug: (drug) =>
        sync((prev) => ({
          ...prev,
          drugs: [...prev.drugs, { ...drug, id: `dr_${Date.now().toString(36)}` }],
          activities: logActivity(prev.activities, actor(), "drug", `Added drug ${drug.brandName}`),
        })),

      updateDrug: (id, patch) =>
        sync((prev) => ({
          ...prev,
          drugs: prev.drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      addSupplier: (s) =>
        sync((prev) => ({
          ...prev,
          suppliers: [...prev.suppliers, { ...s, id: `sup_${Date.now().toString(36)}` }],
        })),

      updateSupplier: (id, patch) =>
        sync((prev) => ({
          ...prev,
          suppliers: prev.suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      createPO: (supplierId, lines, notes) =>
        sync((prev) => ({
          ...prev,
          purchaseOrders: [
            {
              id: `po_${Date.now()}`,
              supplierId,
              status: "draft",
              createdAt: new Date().toISOString(),
              lines,
              notes,
            },
            ...prev.purchaseOrders,
          ],
          activities: logActivity(prev.activities, actor(), "po", "Created purchase order"),
        })),

      updatePOStatus: (id, status) =>
        sync((prev) => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((p) => (p.id === id ? { ...p, status } : p)),
        })),

      receivePO: (poId, received) => {
        sync((prev) => {
          const po = prev.purchaseOrders.find((p) => p.id === poId);
          if (!po) return prev;
          const newStock = [...prev.stock];
          const newLines = po.lines.map((l) => {
            const r = received[l.drugId];
            if (!r) return l;
            const drug = prev.drugs.find((d) => d.id === l.drugId);
            newStock.push({
              id: `stk_${Date.now()}_${l.drugId}`,
              drugId: l.drugId,
              batchNo: r.batchNo,
              expiry: r.expiry,
              qtyOnHand: r.qty,
              reserved: 0,
              purchaseRate: l.rate,
              mrp: drug?.defaultMrp ?? l.rate * 1.3,
              rack: "RECV",
              supplierId: po.supplierId,
              quarantined: false,
            });
            return { ...l, qtyReceived: l.qtyReceived + r.qty };
          });
          const allReceived = newLines.every((l) => l.qtyReceived >= l.qtyOrdered);
          const anyReceived = newLines.some((l) => l.qtyReceived > 0);
          const status = allReceived ? "received" : anyReceived ? "partial" : po.status;
          return {
            ...prev,
            stock: newStock,
            purchaseOrders: prev.purchaseOrders.map((p) =>
              p.id === poId ? { ...p, lines: newLines, status } : p,
            ),
            activities: logActivity(prev.activities, actor(), "grn", `GRN for ${poId}`),
          };
        });
      },

      adjustStock: (batchId, delta, reason) =>
        sync((prev) => ({
          ...prev,
          stock: prev.stock.map((s) => (s.id === batchId ? { ...s, qtyOnHand: Math.max(0, s.qtyOnHand + delta) } : s)),
          activities: logActivity(prev.activities, actor(), "adjust", `Stock adjust ${delta}: ${reason}`, batchId),
        })),

      quarantineBatch: (batchId, quarantined) =>
        sync((prev) => ({
          ...prev,
          stock: prev.stock.map((s) => (s.id === batchId ? { ...s, quarantined } : s)),
        })),

      createBill: (input) => {
        const id = `bill_${Date.now()}`;
        sync((prev) => ({
          ...prev,
          bills: [{ ...input, id, createdAt: new Date().toISOString() }, ...prev.bills],
        }));
        return id;
      },

      markBillPaid: (id, mode) =>
        sync((prev) => ({
          ...prev,
          bills: prev.bills.map((b) => (b.id === id ? { ...b, paid: true, paymentMode: mode } : b)),
        })),

      approveReturn: (id) =>
        sync((prev) => ({
          ...prev,
          returns: prev.returns.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)),
        })),

      restockReturn: (id) => {
        sync((prev) => {
          const ret = prev.returns.find((r) => r.id === id);
          if (!ret || !ret.batchId) return prev;
          return {
            ...prev,
            returns: prev.returns.map((r) => (r.id === id ? { ...r, status: "restocked" as const } : r)),
            stock: prev.stock.map((s) => (s.id === ret.batchId ? { ...s, qtyOnHand: s.qtyOnHand + ret.qty } : s)),
          };
        });
      },

      fulfillIndent: (id, qty) =>
        sync((prev) => ({
          ...prev,
          indents: prev.indents.map((i) =>
            i.id === id ? { ...i, qtyIssued: qty, status: qty >= i.qtyRequested ? "issued" : i.status } : i,
          ),
          activities: logActivity(prev.activities, actor(), "indent", `Issued ${qty} units`, id),
        })),

      addStaff: (s, password) => {
        const id = `phm_${Date.now().toString(36)}`;
        const pwd = password ?? `welcome${Math.floor(1000 + Math.random() * 9000)}`;
        sync((prev) => ({
          ...prev,
          staff: [...prev.staff, { ...s, id }],
          staffPasswords: { ...prev.staffPasswords, [id]: pwd },
        }));
        return pwd;
      },
    };
  }, [state, ready, error, refresh, sync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePharmacyStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePharmacyStore must be used within PharmacyStoreProvider");
  return ctx;
}

export { PHARMACY_MANAGER_ID };
