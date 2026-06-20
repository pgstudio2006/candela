"use client";

import type { Patient, Visit } from "@/design-system/frontdesk-data";
import {
  CONSENT_TEMPLATES,
  consentProgress,
  queueWaitMinutes,
  requiredConsentsComplete,
  type ConsentRecord,
  type NursingEpisode,
  type NursingHandoffPayload,
  type VitalsRecord,
} from "@/design-system/nurse-data";
import {
  claimEpisodeAction,
  completeEpisodeAction,
  completeSessionAction,
  declineConsentAction,
  getNurseSnapshotAction,
  presentConsentAction,
  saveVitalsAction,
  signConsentAction,
  startSessionAction,
  updateEpisodeNotesAction,
  uploadConsentAction,
  verifyConsentAction,
} from "@/app/actions/nurse-actions";
import { useSession } from "@/components/candela/session-provider";
import { parseActionError } from "@/lib/action-errors";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
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

type NurseState = {
  patients: Patient[];
  visits: Visit[];
  handoffs: NursingHandoffPayload[];
  episodes: NursingEpisode[];
  activeNurseId: string;
  activeNurseName: string;
  branchId: string;
};

type NurseStoreValue = {
  ready: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  patients: Patient[];
  visits: Visit[];
  handoffs: NursingHandoffPayload[];
  episodes: NursingEpisode[];
  activeNurseId: string;
  activeNurseName: string;
  activeBranchId: string;
  getPatient: (id: string) => Patient | undefined;
  getVisit: (id: string) => Visit | undefined;
  getHandoff: (visitId: string) => NursingHandoffPayload | undefined;
  getEpisode: (visitId: string) => NursingEpisode | undefined;
  getQueue: () => NursingHandoffPayload[];
  getFilteredQueue: () => NursingHandoffPayload[];
  getAllConsents: () => Array<ConsentRecord & { patientName: string; nurseName: string }>;
  claimEpisode: (visitId: string) => Promise<NursingEpisode>;
  saveVitals: (
    visitId: string,
    vitals: Omit<VitalsRecord, "visitId" | "recordedAt" | "recordedBy">,
  ) => Promise<{ ok: boolean; error?: string }>;
  presentConsent: (visitId: string, consentId: string) => Promise<void>;
  signConsent: (
    visitId: string,
    consentId: string,
    data: {
      signatureDataUrl: string;
      signerName: string;
      signerRole?: ConsentRecord["signerRole"];
      witnessName?: string;
    },
  ) => Promise<void>;
  uploadConsent: (
    visitId: string,
    consentId: string,
    data: { uploadDataUrl: string; uploadFileName: string; signerName: string },
  ) => Promise<void>;
  verifyConsent: (visitId: string, consentId: string) => Promise<void>;
  declineConsent: (visitId: string, consentId: string, reason: string) => Promise<void>;
  startSession: (visitId: string, bay: string) => Promise<void>;
  completeSession: (
    visitId: string,
    sessionId: string,
    notes?: string,
  ) => Promise<{ ok: boolean; error?: string; nextSessionNumber?: number }>;
  completeEpisode: (visitId: string) => Promise<{ ok: boolean; error?: string }>;
  updateEpisodeNotes: (visitId: string, notes: string) => Promise<void>;
  getDashboardKpis: () => { label: string; value: string; delta: string; trend: "up" | "down" | "neutral" }[];
  getAnalytics: () => {
    consentRate: number;
    avgIntakeMin: number;
    sessionsToday: number;
    uploadVsSign: { sign: number; upload: number };
    byPath: { label: string; count: number }[];
  };
  searchPatients: (q: string) => Patient[];
};

const NurseContext = createContext<NurseStoreValue | null>(null);

function applySnapshot(snapshot: Awaited<ReturnType<typeof getNurseSnapshotAction>>): NurseState {
  return {
    patients: snapshot.patients,
    visits: snapshot.visits,
    handoffs: snapshot.handoffs,
    episodes: snapshot.episodes,
    activeNurseId: snapshot.activeNurseId,
    activeNurseName: snapshot.activeNurseName,
    branchId: snapshot.branchId,
  };
}

export function NurseStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [state, setState] = useState<NurseState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const snapshot = await getNurseSnapshotAction();
      setState(applySnapshot(snapshot));
      setError(null);
    } catch (err) {
      setError(parseActionError(err).message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !session?.branchId) return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      if (cancelled) return;
      try {
        const snapshot = await getNurseSnapshotAction();
        if (cancelled) return;
        setState(applySnapshot(snapshot));
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
  }, [authReady, session?.branchId]);

  const value = useMemo<NurseStoreValue>(() => {
    const data = state ?? {
      patients: [],
      visits: [],
      handoffs: [],
      episodes: [],
      activeNurseId: "",
      activeNurseName: "Nurse",
      branchId: "",
    };

    const getPatient = (id: string) => data.patients.find((p) => p.id === id);
    const getVisit = (id: string) => data.visits.find((v) => v.id === id);
    const getHandoff = (visitId: string) => data.handoffs.find((h) => h.visitId === visitId);
    const getEpisode = (visitId: string) => data.episodes.find((e) => e.visitId === visitId);

    const getQueue = () =>
      data.handoffs.filter((h) => {
        const ep = getEpisode(h.visitId);
        return !ep || ep.status !== "completed";
      });

    const getFilteredQueue = () =>
      [...getQueue()].sort((a, b) => {
        const epA = getEpisode(a.visitId);
        const epB = getEpisode(b.visitId);
        const priA = epA?.priority === "high" || a.treatmentPath === "ipd" || Boolean(epA?.vitals?.redFlags?.trim());
        const priB = epB?.priority === "high" || b.treatmentPath === "ipd" || Boolean(epB?.vitals?.redFlags?.trim());
        if (priA && !priB) return -1;
        if (priB && !priA) return 1;
        return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
      });

    const getAllConsents = () =>
      data.episodes.flatMap((ep) => {
        const patient = getPatient(ep.patientId);
        return ep.consents
          .filter((c) => c.status !== "draft")
          .map((c) => ({
            ...c,
            patientName: patient?.name ?? "Patient",
            nurseName: ep.nurseName,
          }));
      });

    return {
      ready,
      error,
      refresh,
      patients: data.patients,
      visits: data.visits,
      handoffs: data.handoffs,
      episodes: data.episodes,
      activeNurseId: data.activeNurseId,
      activeNurseName: data.activeNurseName,
      activeBranchId: data.branchId,
      getPatient,
      getVisit,
      getHandoff,
      getEpisode,
      getQueue,
      getFilteredQueue,
      getAllConsents,
      claimEpisode: async (visitId) => {
        const episode = await claimEpisodeAction(visitId);
        await refresh({ silent: true });
        return episode;
      },
      saveVitals: async (visitId, vitals) => {
        try {
          await saveVitalsAction(visitId, vitals);
          await refresh({ silent: true });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: parseActionError(err).message };
        }
      },
      presentConsent: async (visitId, consentId) => {
        await presentConsentAction(visitId, consentId);
        await refresh({ silent: true });
      },
      signConsent: async (visitId, consentId, payload) => {
        await signConsentAction(visitId, consentId, payload);
        await refresh({ silent: true });
      },
      uploadConsent: async (visitId, consentId, payload) => {
        await uploadConsentAction(visitId, consentId, payload);
        await refresh({ silent: true });
      },
      verifyConsent: async (visitId, consentId) => {
        await verifyConsentAction(visitId, consentId);
        await refresh({ silent: true });
      },
      declineConsent: async (visitId, consentId, reason) => {
        await declineConsentAction(visitId, consentId, reason);
        await refresh({ silent: true });
      },
      startSession: async (visitId, bay) => {
        await startSessionAction(visitId, bay);
        await refresh({ silent: true });
      },
      completeSession: async (visitId, sessionId, notes) => {
        try {
          const result = await completeSessionAction(visitId, sessionId, notes);
          await refresh({ silent: true });
          return { ok: true, nextSessionNumber: result.nextSessionNumber };
        } catch (err) {
          return { ok: false, error: parseActionError(err).message };
        }
      },
      completeEpisode: async (visitId) => {
        try {
          await completeEpisodeAction(visitId);
          await refresh();
          return { ok: true };
        } catch (err) {
          return { ok: false, error: parseActionError(err).message };
        }
      },
      updateEpisodeNotes: async (visitId, notes) => {
        await updateEpisodeNotesAction(visitId, notes);
        await refresh({ silent: true });
      },
      getDashboardKpis: () => {
        const queue = getFilteredQueue();
        const consentPending = data.episodes.filter((e) => e.status === "consent").length;
        const ready = data.episodes.filter((e) => e.status === "ready" || e.status === "in_treatment").length;
        const redFlag = data.episodes.filter((e) => e.vitals?.redFlags?.trim()).length;
        return [
          {
            label: "Execution queue",
            value: String(queue.length),
            delta: queue.length ? "Awaiting intake" : "Clear",
            trend: queue.length > 2 ? ("down" as const) : ("neutral" as const),
          },
          {
            label: "Consent pending",
            value: String(consentPending),
            delta: "Clinical gate",
            trend: consentPending ? ("down" as const) : ("neutral" as const),
          },
          {
            label: "Ready / in treatment",
            value: String(ready),
            delta: "Active bays",
            trend: "up" as const,
          },
          {
            label: "Red-flag cases",
            value: String(redFlag),
            delta: "Priority review",
            trend: redFlag ? ("down" as const) : ("neutral" as const),
          },
          {
            label: "Avg wait",
            value: queue[0] ? `${queueWaitMinutes(queue[0].sentAt)}m` : "—",
            delta: "Oldest in queue",
            trend: "neutral" as const,
          },
          {
            label: "Nurse",
            value: data.activeNurseName.split(" ")[0] ?? "—",
            delta: "Signed in",
            trend: "neutral" as const,
          },
        ];
      },
      getAnalytics: () => {
        const eps = data.episodes;
        const withConsent = eps.filter((e) => requiredConsentsComplete(e.consents));
        const signed = eps.flatMap((e) => e.consents).filter((c) => c.captureMode === "canvas");
        const uploaded = eps.flatMap((e) => e.consents).filter((c) => c.captureMode === "upload");
        const completed = eps.filter((e) => e.completedAt && e.queuedAt);
        const avgMin =
          completed.length > 0
            ? Math.round(
                completed.reduce(
                  (s, e) => s + (new Date(e.completedAt!).getTime() - new Date(e.queuedAt).getTime()) / 60000,
                  0,
                ) / completed.length,
              )
            : 0;
        const paths = ["opd", "ipd", "daycare"].map((p) => ({
          label: p.toUpperCase(),
          count: eps.filter((e) => e.treatmentPath === p).length,
        }));
        const today = new Date().toDateString();
        const sessionsToday = eps
          .flatMap((e) => e.sessions)
          .filter((s) => s.completedAt && new Date(s.completedAt).toDateString() === today).length;
        return {
          consentRate: eps.length ? Math.round((withConsent.length / eps.length) * 100) : 0,
          avgIntakeMin: avgMin,
          sessionsToday,
          uploadVsSign: { sign: signed.length, upload: uploaded.length },
          byPath: paths,
        };
      },
      searchPatients: (q: string) => {
        const query = q.trim().toLowerCase();
        if (!query) return data.patients;
        return data.patients.filter(
          (p) =>
            patientDisplayName(p).toLowerCase().includes(query) ||
            p.uhid.toLowerCase().includes(query) ||
            p.phone.includes(query),
        );
      },
    };
  }, [state, ready, error, refresh]);

  return <NurseContext.Provider value={value}>{children}</NurseContext.Provider>;
}

export function useNurseStore() {
  const ctx = useContext(NurseContext);
  if (!ctx) throw new Error("useNurseStore must be used within NurseStoreProvider");
  return ctx;
}

export { CONSENT_TEMPLATES };
