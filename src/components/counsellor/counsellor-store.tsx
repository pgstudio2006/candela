"use client";

import type { Patient, Visit } from "@/design-system/frontdesk-data";
import { PATIENTS, VISITS } from "@/design-system/frontdesk-data";
import {
  DEFAULT_DISCOUNT_POLICY,
  DEMO_COUNSELLOR_ID,
  DEMO_COUNSELLOR_NAME,
  computeQuote,
  packageById,
  queueWaitMinutes,
  type BillingHandoffPayload,
  type CounselOutcome,
  type CounselQuote,
  type CounselSession,
  type DiscountApproval,
  type DiscountPolicy,
} from "@/design-system/counsellor-data";
import type { CounsellorQueueItem } from "@/design-system/doctor-data";
import {
  getCounsellorStateAction,
  listBillingHandoffsAction,
  listCounsellorPatientsAction,
  listCounsellorQueueAction,
  listCounsellorVisitsAction,
  removeCounsellorQueueItemAction,
  saveBillingHandoffAction,
  saveCounsellorStateAction,
  setVisitStageAction,
} from "@/server/counsellor/actions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CounsellorState = {
  sessions: CounselSession[];
  approvals: DiscountApproval[];
  discountPolicy: DiscountPolicy;
  activeCounsellorId: string;
  activeBranchId: string;
  seniorMode: boolean;
};

type CounsellorStoreValue = {
  ready: boolean;
  patients: Patient[];
  visits: Visit[];
  queue: CounsellorQueueItem[];
  sessions: CounselSession[];
  approvals: DiscountApproval[];
  discountPolicy: DiscountPolicy;
  activeBranchId: string;
  seniorMode: boolean;
  getPatient: (id: string) => Patient | undefined;
  getVisit: (id: string) => Visit | undefined;
  getQueueItem: (visitId: string) => CounsellorQueueItem | undefined;
  getSession: (visitId: string) => CounselSession | undefined;
  getFilteredQueue: (opts?: { priority?: string; doctorId?: string }) => CounsellorQueueItem[];
  claimSession: (visitId: string) => CounselSession;
  updateSession: (visitId: string, patch: Partial<CounselSession>) => void;
  buildQuote: (
    visitId: string,
    packageId: string,
    addonIds: string[],
    discountPercent: number,
    discountReason?: string,
    tier?: CounselQuote["tier"],
  ) => CounselQuote;
  requestDiscountApproval: (visitId: string, quote: CounselQuote, reason: string) => void;
  resolveApproval: (approvalId: string, approved: boolean) => void;
  completeSession: (
    visitId: string,
    outcome: CounselOutcome,
    opts: {
      quote?: CounselQuote;
      internalNotes: string;
      objections: string[];
      callbackAt?: string;
      sendToBilling?: boolean;
      paymentExpectation?: BillingHandoffPayload["paymentExpectation"];
      consentCaptured?: boolean;
      whatsappSent?: boolean;
      voiceNote?: string;
      aiScript?: string;
    },
  ) => void;
  getBillingHandoffs: () => BillingHandoffPayload[];
  getDashboardKpis: () => { label: string; value: string; delta: string; trend: "up" | "down" | "neutral" }[];
  getAnalytics: () => {
    conversionRate: number;
    avgDiscount: number;
    avgCloseMin: number;
    pipelineValue: number;
    outcomes: { label: string; count: number }[];
    packageMix: { label: string; count: number }[];
    lostReasons: { label: string; count: number }[];
  };
  searchPatients: (q: string) => Patient[];
  getPatientCommercialHistory: (patientId: string) => CounselSession[];
  maxDiscountPercent: () => number;
  setSeniorMode: (v: boolean) => void;
  setActiveBranch: (id: string) => void;
};

const CounsellorContext = createContext<CounsellorStoreValue | null>(null);

function loadState(): CounsellorState {
  return {
    sessions: [],
    approvals: [],
    discountPolicy: DEFAULT_DISCOUNT_POLICY,
    activeCounsellorId: DEMO_COUNSELLOR_ID,
    activeBranchId: "branch_gurgaon",
    seniorMode: false,
  };
}

async function persist(state: CounsellorState) {
  await saveCounsellorStateAction(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("candela-counsellor-updated"));
  }
}

export function CounsellorStoreProvider({ children }: { children: ReactNode }) {
  const [clinical, setClinical] = useState(() => ({
    patients: structuredClone(PATIENTS),
    visits: structuredClone(VISITS),
  }));
  const [counsellor, setCounsellor] = useState<CounsellorState>(loadState);
  const [queue, setQueue] = useState<CounsellorQueueItem[]>([]);
  const [billingHandoffs, setBillingHandoffs] = useState<BillingHandoffPayload[]>([]);
  const [ready, setReady] = useState(false);

  const refreshQueue = useCallback(async () => {
    const [nextQueue, patients, visits, handoffs] = await Promise.all([
      listCounsellorQueueAction(),
      listCounsellorPatientsAction(),
      listCounsellorVisitsAction(),
      listBillingHandoffsAction(),
    ]);
    setQueue(nextQueue);
    setClinical({ patients, visits });
    setBillingHandoffs(handoffs);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [remoteState] = await Promise.all([getCounsellorStateAction(), refreshQueue()]);
        if (!mounted) return;
        setCounsellor(remoteState);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    const onUpdate = () => {
      void refreshQueue();
    };
    window.addEventListener("candela-counsellor-queue-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("candela-counsellor-queue-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refreshQueue]);

  const syncCounsellor = useCallback((fn: (prev: CounsellorState) => CounsellorState) => {
    setCounsellor((prev) => {
      const next = fn(prev);
      void persist(next);
      return next;
    });
  }, []);

  const value = useMemo<CounsellorStoreValue>(() => {
    const { patients, visits } = clinical;

    const getPatient = (id: string) => patients.find((p) => p.id === id);
    const getVisit = (id: string) => visits.find((v) => v.id === id);
    const getQueueItem = (visitId: string) => queue.find((q) => q.visitId === visitId);

    const getFilteredQueue = (opts?: { priority?: string; doctorId?: string }) =>
      [...queue]
        .filter((q) => !opts?.priority || q.priority === opts.priority)
        .filter((q) => !opts?.doctorId || q.doctorId === opts.doctorId)
        .sort((a, b) => {
          if (a.priority === "high" && b.priority !== "high") return -1;
          if (b.priority === "high" && a.priority !== "high") return 1;
          return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
        });

    const getSession = (visitId: string) =>
      counsellor.sessions.find((s) => s.visitId === visitId && !s.completedAt);

    const maxDiscountPercent = () =>
      counsellor.seniorMode
        ? counsellor.discountPolicy.seniorMaxPercent
        : counsellor.discountPolicy.counsellorMaxPercent;

    const claimSession = (visitId: string) => {
      const existing = getSession(visitId);
      if (existing) return existing;
      const item = getQueueItem(visitId);
      if (!item) throw new Error("Not in queue");
      const session: CounselSession = {
        id: `cs_${Date.now()}`,
        visitId,
        patientId: item.patientId,
        queueItemId: item.id,
        counsellorId: counsellor.activeCounsellorId,
        counsellorName: DEMO_COUNSELLOR_NAME,
        branchId: counsellor.activeBranchId,
        startedAt: new Date().toISOString(),
        internalNotes: "",
        patientObjections: [],
        sentToBilling: false,
      };
      syncCounsellor((prev) => ({ ...prev, sessions: [...prev.sessions, session] }));
      return session;
    };

    const updateSession = (visitId: string, patch: Partial<CounselSession>) => {
      syncCounsellor((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.visitId === visitId && !s.completedAt ? { ...s, ...patch } : s,
        ),
      }));
    };

    const buildQuote = (
      visitId: string,
      packageId: string,
      addonIds: string[],
      discountPercent: number,
      discountReason?: string,
      tier: CounselQuote["tier"] = "better",
    ): CounselQuote => {
      const item = getQueueItem(visitId);
      const base = computeQuote(packageId, addonIds, discountPercent);
      const limit = maxDiscountPercent();
      let approvalStatus: CounselQuote["approvalStatus"] = "none";
      if (discountPercent > counsellor.discountPolicy.managerApprovalAbove) approvalStatus = "pending";
      else if (discountPercent > limit) approvalStatus = "pending";

      return {
        visitId,
        patientId: item?.patientId ?? "",
        ...base,
        tier,
        discountReason,
        approvalStatus,
        consentCaptured: false,
        whatsappSent: false,
      };
    };

    const requestDiscountApproval = (visitId: string, quote: CounselQuote, reason: string) => {
      const patient = getPatient(quote.patientId);
      const approval: DiscountApproval = {
        id: `appr_${Date.now()}`,
        visitId,
        patientId: quote.patientId,
        patientName: patient?.name ?? quote.patientId,
        requestedPercent: quote.discountPercent,
        reason,
        status: "pending",
        requestedAt: new Date().toISOString(),
        quoteSnapshot: quote,
      };
      syncCounsellor((prev) => ({ ...prev, approvals: [...prev.approvals, approval] }));
    };

    const resolveApproval = (approvalId: string, approved: boolean) => {
      syncCounsellor((prev) => ({
        ...prev,
        approvals: prev.approvals.map((a) =>
          a.id === approvalId
            ? { ...a, status: approved ? "approved" : "rejected", resolvedAt: new Date().toISOString() }
            : a,
        ),
      }));
    };

    const completeSession = (
      visitId: string,
      outcome: CounselOutcome,
      opts: {
        quote?: CounselQuote;
        internalNotes: string;
        objections: string[];
        callbackAt?: string;
        sendToBilling?: boolean;
        paymentExpectation?: BillingHandoffPayload["paymentExpectation"];
        consentCaptured?: boolean;
        whatsappSent?: boolean;
        voiceNote?: string;
        aiScript?: string;
      },
    ) => {
      const item = getQueueItem(visitId);
      const patient = item ? getPatient(item.patientId) : undefined;
      const now = new Date().toISOString();

      syncCounsellor((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.visitId === visitId && !s.completedAt
            ? {
                ...s,
                completedAt: now,
                outcome,
                quote: opts.quote,
                internalNotes: opts.internalNotes,
                patientObjections: opts.objections,
                callbackAt: opts.callbackAt,
                voiceNote: opts.voiceNote,
                aiScript: opts.aiScript,
                sentToBilling: Boolean(opts.sendToBilling && outcome === "converted"),
                billingSentAt: opts.sendToBilling ? now : undefined,
              }
            : s,
        ),
      }));

      if (opts.sendToBilling && outcome === "converted" && opts.quote && item && patient) {
        const handoffPayload: BillingHandoffPayload = {
          visitId,
          patientId: patient.id,
          patientName: patient.name,
          uhid: patient.uhid,
          quote: {
            ...opts.quote,
            consentCaptured: opts.consentCaptured ?? false,
            whatsappSent: opts.whatsappSent ?? false,
          },
          counsellorName: DEMO_COUNSELLOR_NAME,
          counselNotes: opts.internalNotes,
          doctorName: item.doctorName,
          doctorId: item.doctorId,
          sentAt: now,
          paymentExpectation: opts.paymentExpectation ?? "desk",
          treatmentMode: item.treatmentMode ?? item.payload.treatmentMode,
          admissionRecommended:
            item.treatmentMode === "ipd" ||
            item.payload.treatmentMode === "ipd" ||
            item.payload.treatmentMode === "daycare" ||
            Boolean(opts.quote?.lineItems.some((l) => l.id === "addon_ipd_day")),
          diagnosisSummary: String(
            item.payload.diagnosis?.primaryDiagnosis ?? item.payload.diagnosis?.primary ?? "",
          ),
        };
        void saveBillingHandoffAction(handoffPayload);
        setClinical((prev) => ({
          ...prev,
          visits: prev.visits.map((v) =>
            v.id === visitId
              ? { ...v, stage: "billing", billAmount: opts.quote!.netAmount, billing: "pending" as const }
              : v,
          ),
        }));
        void setVisitStageAction(visitId, "billing");
      } else if (outcome === "converted") {
        void setVisitStageAction(visitId, "completed");
      }

      void removeCounsellorQueueItemAction(visitId);
      void refreshQueue();
    };

    const completedSessions = counsellor.sessions.filter((s) => s.completedAt);
    const converted = completedSessions.filter((s) => s.outcome === "converted");

    return {
      ready,
      patients,
      visits,
      queue,
      sessions: counsellor.sessions,
      approvals: counsellor.approvals.filter((a) => a.status === "pending"),
      discountPolicy: counsellor.discountPolicy,
      activeBranchId: counsellor.activeBranchId,
      seniorMode: counsellor.seniorMode,
      getPatient,
      getVisit,
      getQueueItem,
      getSession,
      getFilteredQueue,
      claimSession,
      updateSession,
      buildQuote,
      requestDiscountApproval,
      resolveApproval,
      completeSession,
      getBillingHandoffs: () => billingHandoffs,
      maxDiscountPercent,
      setSeniorMode: (v: boolean) => syncCounsellor((prev) => ({ ...prev, seniorMode: v })),
      setActiveBranch: (id: string) => syncCounsellor((prev) => ({ ...prev, activeBranchId: id })),
      getDashboardKpis: () => {
        const waiting = queue.length;
        const pipeline = queue.reduce((s, q) => s + (packageById(q.packageId ?? "pkg_basic")?.amount ?? 0), 0);
        const todayConverted = converted.filter((s) => {
          const d = new Date(s.completedAt!);
          return d.toDateString() === new Date().toDateString();
        }).length;
        const pendingApprovals = counsellor.approvals.filter((a) => a.status === "pending").length;
        return [
          { label: "Queue waiting", value: String(waiting), delta: waiting ? "Needs counsel" : "Clear", trend: waiting > 2 ? "down" as const : "neutral" as const },
          { label: "Converted today", value: String(todayConverted), delta: "Packages sold", trend: "up" as const },
          { label: "Pipeline value", value: `₹${(pipeline / 1000).toFixed(0)}K`, delta: "In queue", trend: "neutral" as const },
          { label: "Discount approvals", value: String(pendingApprovals), delta: "Pending manager", trend: pendingApprovals ? "down" as const : "neutral" as const },
          { label: "Conversion rate", value: completedSessions.length ? `${Math.round((converted.length / completedSessions.length) * 100)}%` : "—", delta: "Outcomes", trend: "neutral" as const },
          { label: "Avg wait", value: queue[0] ? `${queueWaitMinutes(queue[0].sentAt)}m` : "0m", delta: "Oldest", trend: "neutral" as const },
        ];
      },
      getAnalytics: () => {
        const outcomes = new Map<string, number>();
        for (const s of completedSessions) {
          outcomes.set(s.outcome ?? "deferred", (outcomes.get(s.outcome ?? "deferred") ?? 0) + 1);
        }
        const pkgMix = new Map<string, number>();
        for (const s of converted) {
          const l = s.quote?.packageLabel ?? "Unknown";
          pkgMix.set(l, (pkgMix.get(l) ?? 0) + 1);
        }
        const lost = new Map<string, number>();
        for (const s of completedSessions.filter((x) => x.outcome !== "converted")) {
          for (const o of s.patientObjections) lost.set(o, (lost.get(o) ?? 0) + 1);
        }
        const discounts = converted.map((s) => s.quote?.discountPercent ?? 0);
        const closeTimes = completedSessions
          .filter((s) => s.completedAt)
          .map((s) => (new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000);
        return {
          conversionRate: completedSessions.length ? Math.round((converted.length / completedSessions.length) * 100) : 0,
          avgDiscount: discounts.length ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0,
          avgCloseMin: closeTimes.length ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length) : 0,
          pipelineValue: queue.reduce((s, q) => s + (packageById(q.packageId ?? "pkg_basic")?.amount ?? 0), 0),
          outcomes: [...outcomes.entries()].map(([label, count]) => ({ label, count })),
          packageMix: [...pkgMix.entries()].map(([label, count]) => ({ label, count })),
          lostReasons: [...lost.entries()].map(([label, count]) => ({ label, count })).slice(0, 6),
        };
      },
      searchPatients: (q: string) => {
        const query = q.trim().toLowerCase();
        if (!query) return patients;
        return patients.filter(
          (p) => p.name.toLowerCase().includes(query) || p.uhid.toLowerCase().includes(query),
        );
      },
      getPatientCommercialHistory: (patientId: string) =>
        counsellor.sessions
          .filter((s) => s.patientId === patientId && s.completedAt)
          .sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1)),
    };
  }, [clinical, counsellor, queue, billingHandoffs, ready, syncCounsellor, refreshQueue]);

  return <CounsellorContext.Provider value={value}>{children}</CounsellorContext.Provider>;
}

export function useCounsellorStore() {
  const ctx = useContext(CounsellorContext);
  if (!ctx) throw new Error("useCounsellorStore must be used within CounsellorStoreProvider");
  return ctx;
}
