"use client";

import type { Patient, Visit } from "@/design-system/frontdesk-data";
import {
  CONSENT_TEMPLATES,
  DEMO_NURSE_ID,
  DEMO_NURSE_NAME,
  consentProgress,
  queueWaitMinutes,
  requiredConsentsComplete,
  sessionCountForPackage,
  templatesForHandoff,
  type ConsentRecord,
  type NursingEpisode,
  type NursingHandoffPayload,
  type TreatmentSession,
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
  activeBranchId: string;
};

type NurseStoreValue = {
  ready: boolean;
  patients: Patient[];
  visits: Visit[];
  handoffs: NursingHandoffPayload[];
  episodes: NursingEpisode[];
  getPatient: (id: string) => Patient | undefined;
  getVisit: (id: string) => Visit | undefined;
  getHandoff: (visitId: string) => NursingHandoffPayload | undefined;
  getEpisode: (visitId: string) => NursingEpisode | undefined;
  getQueue: () => NursingHandoffPayload[];
  claimEpisode: (visitId: string) => NursingEpisode;
  saveVitals: (visitId: string, vitals: Omit<VitalsRecord, "visitId" | "recordedAt" | "recordedBy">) => void;
  presentConsent: (visitId: string, consentId: string) => void;
  signConsent: (
    visitId: string,
    consentId: string,
    data: { signatureDataUrl: string; signerName: string; signerRole: ConsentRecord["signerRole"]; witnessName?: string },
  ) => void;
  uploadConsent: (
    visitId: string,
    consentId: string,
    data: { uploadDataUrl: string; uploadFileName: string; signerName: string },
  ) => void;
  verifyConsent: (visitId: string, consentId: string) => void;
  declineConsent: (visitId: string, consentId: string, reason: string) => void;
  startSession: (visitId: string, bay: string) => void;
  completeSession: (visitId: string, sessionId: string, notes?: string) => void;
  completeEpisode: (visitId: string) => void;
  updateEpisodeNotes: (visitId: string, notes: string) => void;
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

function initialState(): NurseState {
  return {
    patients: [],
    visits: [],
    handoffs: [],
    episodes: [],
    activeNurseId: DEMO_NURSE_ID,
    activeBranchId: "branch_gurgaon",
  };
}

function buildConsents(handoff: NursingHandoffPayload): ConsentRecord[] {
  return templatesForHandoff(handoff).map((t) => ({
    id: `cr_${handoff.visitId}_${t.id}`,
    templateId: t.id,
    templateVersion: t.version,
    visitId: handoff.visitId,
    patientId: handoff.patientId,
    label: t.label,
    status: "draft",
    required: t.required,
    language: t.language,
  }));
}

function buildSessions(handoff: NursingHandoffPayload): TreatmentSession[] {
  const total = sessionCountForPackage(handoff.packageId);
  return [
    {
      id: `ts_${handoff.visitId}_1`,
      visitId: handoff.visitId,
      sessionNumber: 1,
      totalSessions: total,
      procedure: handoff.packageLabel,
      status: "scheduled",
    },
  ];
}

export function NurseStoreProvider({ children }: { children: ReactNode }) {
  const [nurse, setNurse] = useState<NurseState>(initialState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    void getNurseSnapshotAction()
      .then((snapshot) => {
        setNurse((prev) => ({
          ...prev,
          patients: snapshot.patients,
          visits: snapshot.visits,
          handoffs: snapshot.handoffs,
          episodes: snapshot.episodes,
        }));
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const syncNurse = useCallback((fn: (prev: NurseState) => NurseState) => {
    setNurse((prev) => {
      const next = fn(prev);
      return next;
    });
  }, []);

  const value = useMemo<NurseStoreValue>(() => {
    const getPatient = (id: string) => nurse.patients.find((p) => p.id === id);
    const getVisit = (id: string) => nurse.visits.find((v) => v.id === id);
    const getHandoff = (visitId: string) => nurse.handoffs.find((h) => h.visitId === visitId);
    const getEpisode = (visitId: string) => nurse.episodes.find((e) => e.visitId === visitId);

    const getQueue = () =>
      nurse.handoffs.filter((h) => {
        const ep = getEpisode(h.visitId);
        return !ep || ep.status !== "completed";
      });

    const claimEpisode = (visitId: string): NursingEpisode => {
      const existing = getEpisode(visitId);
      if (existing) return existing;
      const handoff = getHandoff(visitId);
      if (!handoff) throw new Error("No handoff");

      const episode: NursingEpisode = {
        id: `ep_${visitId}`,
        visitId,
        patientId: handoff.patientId,
        nurseId: nurse.activeNurseId,
        nurseName: DEMO_NURSE_NAME,
        branchId: nurse.activeBranchId,
        treatmentPath: handoff.treatmentPath,
        packageLabel: handoff.packageLabel,
        packageId: handoff.packageId,
        doctorName: handoff.doctorName,
        doctorId: handoff.doctorId,
        billingStatus: handoff.billingStatus,
        balanceDue: handoff.balanceDue,
        status: "queued",
        priority: handoff.treatmentPath === "ipd" ? "high" : "normal",
        queuedAt: handoff.sentAt,
        consents: buildConsents(handoff),
        sessions: buildSessions(handoff),
        internalNotes: "",
      };

      syncNurse((prev) => ({ ...prev, episodes: [...prev.episodes, episode] }));
      void claimEpisodeAction(visitId).then(() => refresh());
      return episode;
    };

    const patchEpisode = (visitId: string, patch: Partial<NursingEpisode>) => {
      syncNurse((prev) => ({
        ...prev,
        episodes: prev.episodes.map((e) => (e.visitId === visitId ? { ...e, ...patch } : e)),
      }));
    };

    const patchConsent = (visitId: string, consentId: string, patch: Partial<ConsentRecord>) => {
      const ep = getEpisode(visitId);
      if (!ep) return;
      patchEpisode(visitId, {
        consents: ep.consents.map((c) => (c.id === consentId ? { ...c, ...patch } : c)),
      });
    };

    return {
      ready,
      patients: nurse.patients,
      visits: nurse.visits,
      handoffs: nurse.handoffs,
      episodes: nurse.episodes,
      getPatient,
      getVisit,
      getHandoff,
      getEpisode,
      getQueue,
      claimEpisode,
      saveVitals: (visitId, vitals) => {
        claimEpisode(visitId);
        const record: VitalsRecord = {
          ...vitals,
          visitId,
          recordedAt: new Date().toISOString(),
          recordedBy: DEMO_NURSE_NAME,
        };
        patchEpisode(visitId, { vitals: record, status: "consent" });
        void saveVitalsAction(visitId, vitals).then(() => refresh());
      },
      presentConsent: (visitId, consentId) => {
        patchConsent(visitId, consentId, { status: "presented" });
        void presentConsentAction(visitId, consentId).then(() => refresh());
      },
      signConsent: (visitId, consentId, data) => {
        patchConsent(visitId, consentId, {
          status: "signed",
          captureMode: "canvas",
          signatureDataUrl: data.signatureDataUrl,
          signerName: data.signerName,
          signerRole: data.signerRole ?? "patient",
          witnessName: data.witnessName,
          signedAt: new Date().toISOString(),
        });
        void signConsentAction(visitId, consentId, data).then(() => refresh());
      },
      uploadConsent: (visitId, consentId, data) => {
        patchConsent(visitId, consentId, {
          status: "uploaded",
          captureMode: "upload",
          uploadDataUrl: data.uploadDataUrl,
          uploadFileName: data.uploadFileName,
          signerName: data.signerName,
          signedAt: new Date().toISOString(),
        });
        void uploadConsentAction(visitId, consentId, data).then(() => refresh());
      },
      verifyConsent: (visitId, consentId) => {
        syncNurse((prev) => {
          const ep = prev.episodes.find((e) => e.visitId === visitId);
          if (!ep) return prev;
          const consents = ep.consents.map((c) =>
            c.id === consentId
              ? {
                  ...c,
                  status: "verified" as const,
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: DEMO_NURSE_NAME,
                }
              : c,
          );
          const nextStatus = requiredConsentsComplete(consents) ? "ready" : ep.status;
          return {
            ...prev,
            episodes: prev.episodes.map((e) =>
              e.visitId === visitId ? { ...e, consents, status: nextStatus } : e,
            ),
          };
        });
        void verifyConsentAction(visitId, consentId).then(() => refresh());
      },
      declineConsent: (visitId, consentId, reason) => {
        patchConsent(visitId, consentId, { status: "declined", declinedReason: reason });
        void declineConsentAction(visitId, consentId, reason).then(() => refresh());
      },
      startSession: (visitId, bay) => {
        const ep = getEpisode(visitId);
        if (!ep || !requiredConsentsComplete(ep.consents)) return;
        const sessions = ep.sessions.map((s, i) =>
          i === 0 ? { ...s, status: "in_progress" as const, bay, startedAt: new Date().toISOString() } : s,
        );
        patchEpisode(visitId, { sessions, status: "in_treatment" });
        void startSessionAction(visitId, bay).then(() => refresh());
      },
      completeSession: (visitId, sessionId, notes) => {
        const ep = getEpisode(visitId);
        if (!ep) return;
        const sessions = ep.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, status: "completed" as const, completedAt: new Date().toISOString(), notes }
            : s,
        );
        patchEpisode(visitId, { sessions });
        void completeSessionAction(visitId, sessionId, notes).then(() => refresh());
      },
      completeEpisode: (visitId) => {
        patchEpisode(visitId, { status: "completed", completedAt: new Date().toISOString() });
        syncNurse((prev) => ({
          ...prev,
          handoffs: prev.handoffs.filter((h) => h.visitId !== visitId),
          visits: prev.visits.map((v) =>
            v.id === visitId ? { ...v, stage: "completed", routingNote: "Treatment session 1 complete · care plan active" } : v,
          ),
        }));
        void completeEpisodeAction(visitId).then(() => refresh());
      },
      updateEpisodeNotes: (visitId, notes) => {
        patchEpisode(visitId, { internalNotes: notes });
        void updateEpisodeNotesAction(visitId, notes).then(() => refresh());
      },
      getDashboardKpis: () => {
        const queue = getQueue();
        const active = nurse.episodes.filter((e) => !["completed", "queued"].includes(e.status) || e.status === "in_treatment");
        const consentPending = nurse.episodes.filter((e) => e.status === "consent").length;
        const ready = nurse.episodes.filter((e) => e.status === "ready" || e.status === "in_treatment").length;
        return [
          { label: "Execution queue", value: String(queue.length), delta: queue.length ? "Awaiting intake" : "Clear", trend: queue.length > 2 ? "down" as const : "neutral" as const },
          { label: "Consent pending", value: String(consentPending), delta: "Clinical gate", trend: consentPending ? "down" as const : "neutral" as const },
          { label: "Ready / in treatment", value: String(ready), delta: "Active bays", trend: "up" as const },
          { label: "Avg wait", value: queue[0] ? `${queueWaitMinutes(queue[0].sentAt)}m` : "—", delta: "Oldest in queue", trend: "neutral" as const },
        ];
      },
      getAnalytics: () => {
        const eps = nurse.episodes;
        const withConsent = eps.filter((e) => requiredConsentsComplete(e.consents));
        const signed = eps.flatMap((e) => e.consents).filter((c) => c.captureMode === "canvas");
        const uploaded = eps.flatMap((e) => e.consents).filter((c) => c.captureMode === "upload");
        const completed = eps.filter((e) => e.completedAt && e.queuedAt);
        const avgMin =
          completed.length > 0
            ? Math.round(
                completed.reduce((s, e) => s + (new Date(e.completedAt!).getTime() - new Date(e.queuedAt).getTime()) / 60000, 0) /
                  completed.length,
              )
            : 0;
        const paths = ["opd", "ipd", "daycare"].map((p) => ({
          label: p.toUpperCase(),
          count: eps.filter((e) => e.treatmentPath === p).length,
        }));
        return {
          consentRate: eps.length ? Math.round((withConsent.length / eps.length) * 100) : 0,
          avgIntakeMin: avgMin,
          sessionsToday: eps.flatMap((e) => e.sessions).filter((s) => s.status === "completed").length,
          uploadVsSign: { sign: signed.length, upload: uploaded.length },
          byPath: paths,
        };
      },
      searchPatients: (q) => {
        const query = q.trim().toLowerCase();
        if (!query) return nurse.patients;
        return nurse.patients.filter(
          (p) => p.name.toLowerCase().includes(query) || p.uhid.toLowerCase().includes(query) || p.phone.includes(query),
        );
      },
    };
  }, [ready, nurse, syncNurse, refresh]);

  return <NurseContext.Provider value={value}>{children}</NurseContext.Provider>;
}

export function useNurseStore() {
  const ctx = useContext(NurseContext);
  if (!ctx) throw new Error("useNurseStore must be used within NurseStoreProvider");
  return ctx;
}

export { CONSENT_TEMPLATES };
