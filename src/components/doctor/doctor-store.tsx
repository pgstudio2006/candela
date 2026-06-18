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
import { computeDoctorChartAnalytics } from "@/lib/doctor-analytics-data";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DoctorState = {
  patients: Patient[];
  visits: Visit[];
  consultations: ConsultationRecord[];
  counsellorQueue: CounsellorQueueItem[];
  ipdPatients: IpdPatient[];
  activeDoctorId: string;
  templates: DoctorTemplate[];
  documentTemplates: DocumentTemplate[];
};

type DoctorStoreValue = {
  ready: boolean;
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
  applyScribeToExamination: (visitId: string) => void;
  completeConsultation: (visitId: string, opts: {
    treatmentMode: TreatmentMode;
    recommendCounsellor: boolean;
    skipCounsellor: boolean;
    handoff: Record<string, string | number | boolean>;
    sendWhatsapp: boolean;
  }) => void;
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
  const [doctor, setDoctor] = useState<DoctorState>(initialDoctorState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getDoctorSnapshotAction(DEMO_DOCTOR_ID);
      setDoctor({
        patients: snapshot.patients,
        visits: snapshot.visits,
        consultations: snapshot.consultations,
        counsellorQueue: snapshot.counsellorQueue,
        ipdPatients: snapshot.ipdPatients,
        activeDoctorId: snapshot.activeDoctorId,
        templates: snapshot.templates,
        documentTemplates: snapshot.documentTemplates,
      });
    } catch {
      // keep current state on refresh failures.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      void startConsultationAction(visitId, doctorId).then(() => refresh());
      return record;
    };

    const updateConsultation = (visitId: string, patch: Partial<ConsultationRecord>) => {
      syncDoctor((prev) => ({
        ...prev,
        consultations: prev.consultations.map((c) =>
          c.visitId === visitId ? { ...c, ...patch } : c,
        ),
      }));
      void updateConsultationAction(visitId, patch as Record<string, unknown>).then(() => refresh());
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
      void saveConsultSectionAction(visitId, section, data).then(() => refresh());
    };

    const setPrescription = (visitId: string, lines: PrescriptionLine[]) => {
      updateConsultation(visitId, { prescription: lines });
      void setPrescriptionAction(visitId, lines).then(() => refresh());
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
      updateConsultation(visitId, { scribeTranscript: transcript, scribeLanguage: language });
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

    const completeConsultation = (
      visitId: string,
      opts: {
        treatmentMode: TreatmentMode;
        recommendCounsellor: boolean;
        skipCounsellor: boolean;
        handoff: Record<string, string | number | boolean>;
        sendWhatsapp: boolean;
      },
    ) => {
      const visit = getVisit(visitId);
      const consult = getConsultation(visitId);
      if (!visit || !consult) return;

      const packageId = String(opts.handoff.packageId ?? "");
      const pkg = CARE_PACKAGES.find((p) => p.id === packageId);
      const doctorName = visit.doctorName || "Doctor";

      const updatedConsult: ConsultationRecord = {
        ...consult,
        status: "completed",
        completedAt: new Date().toISOString(),
        treatmentMode: opts.treatmentMode,
        recommendCounsellor: opts.recommendCounsellor,
        skipCounsellor: opts.skipCounsellor,
        packageId: packageId || undefined,
        counsellorNotes: String(opts.handoff.counsellorNotes ?? ""),
        doctorAdvice: String(opts.handoff.doctorAdvice ?? ""),
        handoff: opts.handoff,
        whatsappRxSent: opts.sendWhatsapp,
      };

      syncDoctor((prev) => {
        let counsellorQueue = prev.counsellorQueue;
        if (opts.recommendCounsellor && !opts.skipCounsellor) {
          counsellorQueue = [
            ...prev.counsellorQueue.filter((q) => q.visitId !== visitId),
            {
              id: `cq_${Date.now()}`,
              visitId,
              patientId: visit.patientId,
              doctorId,
              doctorName,
              sentAt: new Date().toISOString(),
              treatmentMode: opts.treatmentMode,
              packageId,
              packageLabel: pkg?.label,
              priority: String(opts.handoff.conversionPriority ?? "") === "high" ? "high" : "normal",
              payload: updatedConsult,
            },
          ];
        }
        return {
          ...prev,
          consultations: prev.consultations.map((c) =>
            c.visitId === visitId ? updatedConsult : c,
          ),
          counsellorQueue,
        };
      });
      void completeConsultationAction(visitId, opts).then(() => refresh());
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
      void saveIpdRoundAction(ipdId, note).then(() => refresh());
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
      void createDoctorTemplateAction(doctorId, tpl).then(() => refresh());
      return created;
    };

    const updateDoctorTemplate = (id: string, patch: Partial<DoctorTemplate>) => {
      syncDoctor((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      }));
      void updateDoctorTemplateAction(id, patch).then(() => refresh());
    };

    const deleteDoctorTemplate = (id: string) => {
      syncDoctor((prev) => ({
        ...prev,
        templates: prev.templates.filter((t) => t.id !== id),
      }));
      void deleteDoctorTemplateAction(id).then(() => refresh());
    };

    const getPatientConsultations = (patientId: string) =>
      doctor.consultations
        .filter((c) => c.patientId === patientId)
        .sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));

    return {
      ready,
      patients,
      visits,
      activeDoctorId: doctorId,
      consultations: doctor.consultations,
      counsellorQueue: doctor.counsellorQueue,
      ipdPatients: doctor.ipdPatients,
      templates: allTemplates,
      packages: CARE_PACKAGES,
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
        void addDocumentTemplateAction(kind, label, description).then(() => refresh());
      },
      saveDocumentTemplate: (template) => {
        syncDoctor((prev) => ({
          ...prev,
          documentTemplates: prev.documentTemplates.map((t) =>
            t.id === template.id ? template : t,
          ),
        }));
        void saveDocumentTemplateAction(template).then(() => refresh());
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
            p.name.toLowerCase().includes(query) ||
            p.uhid.toLowerCase().includes(query),
        );
      },
    };
  }, [doctor, ready, refresh, syncDoctor]);

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctorStore() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error("useDoctorStore must be used within DoctorStoreProvider");
  return ctx;
}
