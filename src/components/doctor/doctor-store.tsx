"use client";

import type { Patient, Visit } from "@/design-system/frontdesk-data";
import {
  CARE_PACKAGES,
  DEMO_DOCTOR_ID,
  type ConsultationRecord,
  type CounsellorQueueItem,
  type DoctorTemplate,
  type IpdPatient,
  type PrescriptionLine,
  type TreatmentMode,
} from "@/design-system/doctor-data";
import type { DocumentTemplate } from "@/design-system/document-templates";
import {
  addDocumentTemplateAction,
  completeConsultationAction,
  createDoctorTemplateAction,
  deleteDoctorTemplateAction,
  getDoctorSnapshotAction,
  saveConsultSectionAction,
  saveDocumentTemplateAction,
  saveIpdRoundAction,
  setPrescriptionAction,
  startConsultationAction,
  updateConsultationAction,
  updateDoctorTemplateAction,
} from "@/app/actions/doctor-actions";
import type { ScribeDraft } from "@/lib/ai/scribe-types";
import { computeDoctorChartAnalytics } from "@/lib/doctor-analytics-data";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
import { parseActionError } from "@/lib/action-errors";
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
import { useSession } from "@/components/candela/session-provider";

type DoctorState = {
  patients: Patient[];
  visits: Visit[];
  consultations: ConsultationRecord[];
  counsellorQueue: CounsellorQueueItem[];
  ipdPatients: IpdPatient[];
  activeDoctorId: string;
  templates: DoctorTemplate[];
  documentTemplates: DocumentTemplate[];
  packages: typeof CARE_PACKAGES;
};

type DoctorStoreValue = {
  ready: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  patients: Patient[];
  visits: Visit[];
  activeDoctorId: string;
  consultations: ConsultationRecord[];
  counsellorQueue: CounsellorQueueItem[];
  ipdPatients: IpdPatient[];
  templates: DoctorTemplate[];
  packages: typeof CARE_PACKAGES;
  documentTemplates: DocumentTemplate[];
  addDocumentTemplate: (kind: DocumentTemplate["kind"], label: string, description: string) => void;
  saveDocumentTemplate: (template: DocumentTemplate) => void;
  getPatientConsultations: (patientId: string) => ConsultationRecord[];
  createDoctorTemplate: (tpl: Omit<DoctorTemplate, "id" | "doctorId">) => DoctorTemplate;
  updateDoctorTemplate: (id: string, patch: Partial<DoctorTemplate>) => void;
  deleteDoctorTemplate: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;
  getVisit: (id: string) => Visit | undefined;
  getOpdQueue: (doctorId?: string) => Visit[];
  getConsultation: (visitId: string) => ConsultationRecord | undefined;
  startConsultation: (visitId: string) => ConsultationRecord;
  updateConsultation: (visitId: string, patch: Partial<ConsultationRecord>) => void;
  saveConsultSection: (
    visitId: string,
    section: "examination" | "diagnosis" | "treatment",
    data: Record<string, string | number | boolean>,
  ) => void;
  setPrescription: (visitId: string, lines: PrescriptionLine[]) => void;
  applyTemplate: (visitId: string, templateId: string) => void;
  setScribeTranscript: (visitId: string, transcript: string, language: string) => void;
  persistScribeTranscript: (visitId: string, transcript: string, language: string) => void;
  applyScribeDraft: (visitId: string, draft: ScribeDraft) => void;
  applyScribeToExamination: (visitId: string) => void;
  completeConsultation: (visitId: string, opts: {
    treatmentMode: TreatmentMode;
    recommendCounsellor: boolean;
    skipCounsellor: boolean;
    handoff: Record<string, string | number | boolean>;
    sendWhatsapp: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  saveIpdRound: (ipdId: string, note: Record<string, string | number | boolean>) => void;
  getDashboardKpis: () => { label: string; value: string; delta: string; trend: "up" | "down" | "neutral" }[];
  getAnalytics: () => {
    consultsToday: number;
    avgMinutes: number;
    counsellorRate: number;
    topDiagnoses: { label: string; count: number }[];
    templateUsage: { label: string; count: number }[];
  };
  getChartAnalytics: () => ReturnType<typeof computeDoctorChartAnalytics>;
  searchPatients: (q: string) => Patient[];
};

const DoctorContext = createContext<DoctorStoreValue | null>(null);

function initialDoctorState(): DoctorState {
  return {
    patients: [],
    visits: [],
    consultations: [],
    counsellorQueue: [],
    ipdPatients: [],
    activeDoctorId: DEMO_DOCTOR_ID,
    templates: [],
    documentTemplates: [],
    packages: CARE_PACKAGES,
  };
}

function emptyConsultation(visit: Visit, patientId: string, doctorId: string): ConsultationRecord {
  return {
    visitId: visit.id,
    patientId,
    doctorId,
    startedAt: new Date().toISOString(),
    status: "in_progress",
    treatmentMode: "opd",
    recommendCounsellor: true,
    skipCounsellor: false,
    whatsappRxSent: false,
    examination: {},
    diagnosis: {},
    treatment: {},
    prescription: [],
    notes: "",
  };
}

export function DoctorStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [doctor, setDoctor] = useState<DoctorState>(initialDoctorState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const snapshot = await getDoctorSnapshotAction();
      setDoctor({
        patients: snapshot.patients,
        visits: snapshot.visits,
        consultations: snapshot.consultations,
        counsellorQueue: snapshot.counsellorQueue,
        ipdPatients: snapshot.ipdPatients,
        activeDoctorId: snapshot.activeDoctorId,
        templates: snapshot.templates,
        documentTemplates: snapshot.documentTemplates,
        packages: snapshot.packages,
      });
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
      if (attempt === 0) {
        await refresh();
        return;
      }
      await sleep(400 * attempt);
      if (cancelled) return;
      try {
        const snapshot = await getDoctorSnapshotAction();
        if (cancelled) return;
        setDoctor({
          patients: snapshot.patients,
          visits: snapshot.visits,
          consultations: snapshot.consultations,
          counsellorQueue: snapshot.counsellorQueue,
          ipdPatients: snapshot.ipdPatients,
          activeDoctorId: snapshot.activeDoctorId,
          templates: snapshot.templates,
          documentTemplates: snapshot.documentTemplates,
          packages: snapshot.packages,
        });
        setError(null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 2 && isTransientSessionError(err)) {
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
  }, [authReady, session?.branchId, refresh]);

  const syncDoctor = useCallback((fn: (prev: DoctorState) => DoctorState) => {
    setDoctor((prev) => {
      const next = fn(prev);
      return next;
    });
  }, []);

  const value = useMemo<DoctorStoreValue>(() => {
    const { patients, visits } = doctor;
    const doctorId = doctor.activeDoctorId;

    const getPatient = (id: string) => patients.find((p) => p.id === id);
    const getVisit = (id: string) => visits.find((v) => v.id === id);

    const getOpdQueue = (id = doctorId) =>
      visits
        .filter((v) => v.doctorId === id && v.stage === "with_doctor")
        .sort((a, b) => (a.token ?? 99) - (b.token ?? 99));

    const getConsultation = (visitId: string) =>
      doctor.consultations.find((c) => c.visitId === visitId);

    const startConsultation = (visitId: string) => {
      const visit = getVisit(visitId);
      if (!visit) throw new Error("Visit not found");
      const existing = getConsultation(visitId);
      if (existing) return existing;

      const record = emptyConsultation(visit, visit.patientId, doctorId);
      syncDoctor((prev) => ({
        ...prev,
        consultations: [...prev.consultations, record],
      }));
      void startConsultationAction(visitId, doctorId).then(() => refresh({ silent: true }));
      return record;
    };

    const updateConsultation = (visitId: string, patch: Partial<ConsultationRecord>) => {
      syncDoctor((prev) => ({
        ...prev,
        consultations: prev.consultations.map((c) =>
          c.visitId === visitId ? { ...c, ...patch } : c,
        ),
      }));
      void updateConsultationAction(visitId, patch as Record<string, unknown>).then(() =>
        refresh({ silent: true }),
      );
    };

    const saveConsultSection = (
      visitId: string,
      section: "examination" | "diagnosis" | "treatment",
      data: Record<string, string | number | boolean>,
    ) => {
      syncDoctor((prev) => ({
        ...prev,
        consultations: prev.consultations.map((c) =>
          c.visitId === visitId ? { ...c, [section]: { ...c[section], ...data } } : c,
        ),
      }));
      void saveConsultSectionAction(visitId, section, data).then(() => refresh({ silent: true }));
    };

    const setPrescription = (visitId: string, lines: PrescriptionLine[]) => {
      syncDoctor((prev) => ({
        ...prev,
        consultations: prev.consultations.map((c) =>
          c.visitId === visitId ? { ...c, prescription: lines } : c,
        ),
      }));
      void setPrescriptionAction(visitId, lines).then(() => refresh({ silent: true }));
    };

    const applyTemplate = (visitId: string, templateId: string) => {
      const all = doctor.templates;
      const tpl = all.find((t) => t.id === templateId);
      if (!tpl) return;
      updateConsultation(visitId, {
        templateId,
        diagnosis: { ...tpl.diagnosis },
        treatment: { ...tpl.treatment },
        prescription: tpl.prescription.map((p) => ({ ...p, id: `${p.id}_${Date.now()}` })),
      });
    };

    const setScribeTranscript = (visitId: string, transcript: string, language: string) => {
      syncDoctor((prev) => ({
        ...prev,
        consultations: prev.consultations.map((c) =>
          c.visitId === visitId ? { ...c, scribeTranscript: transcript, scribeLanguage: language } : c,
        ),
      }));
    };

    const persistScribeTranscript = (visitId: string, transcript: string, language: string) => {
      setScribeTranscript(visitId, transcript, language);
      void updateConsultationAction(visitId, { scribeTranscript: transcript, scribeLanguage: language }).then(
        () => refresh({ silent: true }),
      );
    };

    const applyScribeDraft = (visitId: string, draft: ScribeDraft) => {
      if (draft.examination && Object.keys(draft.examination).length) {
        saveConsultSection(visitId, "examination", draft.examination);
      }
      if (draft.diagnosis && Object.keys(draft.diagnosis).length) {
        saveConsultSection(visitId, "diagnosis", draft.diagnosis);
      }
      if (draft.treatment && Object.keys(draft.treatment).length) {
        saveConsultSection(visitId, "treatment", draft.treatment);
      }
      if (draft.prescription.length) {
        setPrescription(
          visitId,
          draft.prescription.map((line, i) => ({
            ...line,
            id: `rx_scribe_${Date.now()}_${i}`,
          })),
        );
      }
      updateConsultation(visitId, { scribeAppliedAt: new Date().toISOString() });
    };

    const applyScribeToExamination = (visitId: string) => {
      const c = getConsultation(visitId);
      if (!c?.scribeTranscript) return;
      saveConsultSection(visitId, "examination", {
        chiefComplaint: c.scribeTranscript.slice(0, 500),
        historyPresent: c.scribeTranscript,
      });
      updateConsultation(visitId, { scribeAppliedAt: new Date().toISOString() });
    };

    const completeConsultation = async (
      visitId: string,
      opts: {
        treatmentMode: TreatmentMode;
        recommendCounsellor: boolean;
        skipCounsellor: boolean;
        handoff: Record<string, string | number | boolean>;
        sendWhatsapp: boolean;
      },
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        await completeConsultationAction(visitId, opts);
        await refresh();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: parseActionError(err).message };
      }
    };

    const saveIpdRound = (ipdId: string, note: Record<string, string | number | boolean>) => {
      const text = `S: ${note.subjective}\nO: ${note.objective}\nA: ${note.assessment}\nP: ${note.plan}`;
      syncDoctor((prev) => ({
        ...prev,
        ipdPatients: prev.ipdPatients.map((ip) =>
          ip.id === ipdId
            ? { ...ip, lastRoundAt: new Date().toISOString(), lastRoundNote: text }
            : ip,
        ),
      }));
      void saveIpdRoundAction(ipdId, note).then(() => refresh({ silent: true }));
    };

    const completed = doctor.consultations.filter((c) => c.status === "completed");

    const allTemplates = doctor.templates;

    const createDoctorTemplate = (tpl: Omit<DoctorTemplate, "id" | "doctorId">) => {
      const created: DoctorTemplate = {
        ...tpl,
        id: `tpl_custom_${Date.now()}`,
        doctorId,
      };
      syncDoctor((prev) => ({
        ...prev,
        templates: [...prev.templates, created],
      }));
      void createDoctorTemplateAction(doctorId, tpl).then(() => refresh({ silent: true }));
      return created;
    };

    const updateDoctorTemplate = (id: string, patch: Partial<DoctorTemplate>) => {
      syncDoctor((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      }));
      void updateDoctorTemplateAction(id, patch).then(() => refresh({ silent: true }));
    };

    const deleteDoctorTemplate = (id: string) => {
      syncDoctor((prev) => ({
        ...prev,
        templates: prev.templates.filter((t) => t.id !== id),
      }));
      void deleteDoctorTemplateAction(id).then(() => refresh({ silent: true }));
    };

    const getPatientConsultations = (patientId: string) =>
      doctor.consultations
        .filter((c) => c.patientId === patientId)
        .sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));

    return {
      ready,
      error,
      refresh,
      patients,
      visits,
      activeDoctorId: doctorId,
      consultations: doctor.consultations,
      counsellorQueue: doctor.counsellorQueue,
      ipdPatients: doctor.ipdPatients,
      templates: allTemplates,
      packages: doctor.packages,
      documentTemplates: doctor.documentTemplates,
      addDocumentTemplate: (kind, label, description) => {
        syncDoctor((prev) => ({
          ...prev,
          documentTemplates: [
            ...prev.documentTemplates,
            {
              id: `doc_custom_${Date.now()}`,
              kind,
              label,
              layout: "navayu-letterhead",
              description,
              enabled: true,
              isSystem: false,
            },
          ],
        }));
        void addDocumentTemplateAction(kind, label, description).then(() => refresh({ silent: true }));
      },
      saveDocumentTemplate: (template) => {
        syncDoctor((prev) => ({
          ...prev,
          documentTemplates: prev.documentTemplates.map((t) =>
            t.id === template.id ? template : t,
          ),
        }));
        void saveDocumentTemplateAction(template).then(() => refresh({ silent: true }));
      },
      getPatientConsultations,
      createDoctorTemplate,
      updateDoctorTemplate,
      deleteDoctorTemplate,
      getPatient,
      getVisit,
      getOpdQueue,
      getConsultation,
      startConsultation,
      updateConsultation,
      saveConsultSection,
      setPrescription,
      applyTemplate,
      setScribeTranscript,
      persistScribeTranscript,
      applyScribeDraft,
      applyScribeToExamination,
      completeConsultation,
      saveIpdRound,
      getDashboardKpis: () => {
        const queue = getOpdQueue().length;
        const done = completed.length;
        const ipdDue = doctor.ipdPatients.filter((i) => i.attendingDoctorId === doctorId && !i.lastRoundAt).length;
        const pendingHandoff = doctor.counsellorQueue.length;
        return [
          { label: "OPD queue", value: String(queue), delta: queue ? "Patients waiting" : "Clear", trend: queue > 2 ? "down" as const : "neutral" as const },
          { label: "Consults today", value: String(done), delta: `${done} completed`, trend: "up" as const },
          { label: "IPD rounds due", value: String(ipdDue), delta: "Ward rounds", trend: ipdDue ? "down" as const : "neutral" as const },
          { label: "Counsellor queue", value: String(pendingHandoff), delta: "Awaiting counsel", trend: "neutral" as const },
          { label: "Avg consult", value: "14m", delta: "Target 15m", trend: "neutral" as const },
          { label: "Templates used", value: String(completed.filter((c) => c.templateId).length), delta: "This session", trend: "neutral" as const },
        ];
      },
      getAnalytics: () => {
        const dxMap = new Map<string, number>();
        for (const c of completed) {
          const dx = String(c.diagnosis.primaryDiagnosis ?? "Unspecified");
          dxMap.set(dx, (dxMap.get(dx) ?? 0) + 1);
        }
        const tplMap = new Map<string, number>();
        for (const c of completed) {
          if (!c.templateId) continue;
          const t = allTemplates.find((x) => x.id === c.templateId)?.label ?? c.templateId;
          tplMap.set(t, (tplMap.get(t) ?? 0) + 1);
        }
        const sent = completed.filter((c) => c.recommendCounsellor && !c.skipCounsellor).length;
        return {
          consultsToday: completed.length,
          avgMinutes: 14,
          counsellorRate: completed.length ? Math.round((sent / completed.length) * 100) : 0,
          topDiagnoses: [...dxMap.entries()].map(([label, count]) => ({ label, count })).slice(0, 5),
          templateUsage: [...tplMap.entries()].map(([label, count]) => ({ label, count })),
        };
      },
      getChartAnalytics: () =>
        computeDoctorChartAnalytics(patients, visits, doctor.consultations, doctorId),
      searchPatients: (q: string) => {
        const query = q.trim().toLowerCase();
        if (!query) return patients;
        return patients.filter(
          (p) =>
            patientDisplayName(p).toLowerCase().includes(query) ||
            p.uhid.toLowerCase().includes(query),
        );
      },
    };
  }, [doctor, ready, error, refresh, syncDoctor]);

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctorStore() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error("useDoctorStore must be used within DoctorStoreProvider");
  return ctx;
}
