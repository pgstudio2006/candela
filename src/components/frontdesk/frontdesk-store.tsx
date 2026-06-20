"use client";

import {
  type Patient,
  type Visit,
} from "@/design-system/frontdesk-data";
import { buildActionItems, computeKpis, computeWaitMinutes, findDuplicatePatients, matchPatientByQuery, nextUhid, nowTime, patientDisplayName, sortVisitsByToken, type Appointment, type FormSubmission, type FrontdeskCounters } from "@/lib/frontdesk-workflow";
import type { PaymentScope } from "@/lib/billing-routing";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
import {
  EMPTY_ROSTER,
  resolveDoctorName as rosterDoctorName,
  type ClinicalRoster,
} from "@/lib/clinical-roster";
import { parseActionError } from "@/lib/action-errors";
import { isTransientSessionError, sleep } from "@/lib/session-retry";
import {
  bookAppointmentAction,
  checkInVisitAction,
  completeJuniorExamAction,
  getClinicalSnapshotAction,
  processBillingAction,
  processCounselBillingAction,
  registerPatientAction,
  saveSubmissionAction,
} from "@/app/actions/clinical-actions";
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

type FrontdeskState = {
  patients: Patient[];
  visits: Visit[];
  appointments: Appointment[];
  submissions: FormSubmission[];
  counters: FrontdeskCounters;
  billingHandoffs: BillingHandoffPayload[];
  roster: ClinicalRoster;
};

type RegisterInput = Record<string, string | number | boolean>;
type CheckInInput = Record<string, string | number | boolean>;
type BillingInput = Record<string, string | number | boolean>;
type AppointmentInput = Record<string, string | number | boolean>;
type JuniorExamInput = Record<string, string | number | boolean>;

export type CounselBillingInput = {
  paymentScope: PaymentScope;
  collectedAmount: number;
  mode: string;
  convertToIpd: boolean;
  ward?: string;
  bed?: string;
  deferReason?: string;
  handoff: BillingHandoffPayload;
};

export type BillingResult =
  | {
      ok: true;
      routeHref: string;
      routingLabel: string;
      routingNote: string;
      visitId: string;
      invoiceNumber: string;
      paymentMode: string;
      token?: number;
    }
  | { ok: false; error: string };

export type RegisterPatientResult =
  | { ok: true; patientId: string; visitId: string; uhid: string }
  | { ok: false; error: string; code?: string };

type FrontdeskStoreValue = FrontdeskState & {
  ready: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  resolveDoctorName: (doctorId: string) => string;
  getBillingHandoff: (visitId: string) => BillingHandoffPayload | undefined;
  registerPatientAsync: (
    data: RegisterInput,
    opts?: { startVisit?: boolean; forceDuplicate?: boolean },
  ) => Promise<RegisterPatientResult>;
  checkInVisit: (
    data: CheckInInput,
    visitId?: string,
  ) => Promise<{ ok: boolean; visitId: string; patientId: string; error?: string }>;
  processBilling: (visitId: string, data: BillingInput) => Promise<BillingResult>;
  processCounselBilling: (visitId: string, input: CounselBillingInput) => Promise<BillingResult>;
  completeJuniorExam: (visitId: string, data: JuniorExamInput) => Promise<{ ok: boolean; error?: string }>;
  bookAppointment: (data: AppointmentInput) => Promise<{ appointmentId: string; visitId: string; error?: string }>;
  saveSubmission: (
    formId: string,
    data: Record<string, string | number | boolean>,
    ctx?: { patientId?: string; visitId?: string },
  ) => Promise<void>;
  getSubmission: (formId: string, visitId: string) => FormSubmission | undefined;
  searchPatients: (q: string) => Patient[];
  findDuplicates: (phone: string, firstName?: string) => Patient[];
  getPatient: (id: string) => Patient | undefined;
  getVisit: (id: string) => Visit | undefined;
  getPatientVisits: (patientId: string) => Visit[];
  getWaitingCheckIns: () => { visit: Visit; patient: Patient }[];
  getPendingBilling: () => { visit: Visit; patient: Patient }[];
  getQueueVisits: (doctorId?: string) => Visit[];
  getJuniorExamVisits: () => Visit[];
  getDashboardKpis: () => ReturnType<typeof computeKpis>;
  getActionItems: () => ReturnType<typeof buildActionItems>;
  resetStore: () => void;
};

const FrontdeskContext = createContext<FrontdeskStoreValue | null>(null);

function initialState(): FrontdeskState {
  return {
    patients: [],
    visits: [],
    appointments: [],
    submissions: [],
    counters: { patient: 0, visit: 0, token: 0, appointment: 0 },
    billingHandoffs: [],
    roster: EMPTY_ROSTER,
  };
}

function randomId(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function cloneState(state: FrontdeskState): FrontdeskState {
  return {
    ...state,
    patients: [...state.patients],
    visits: [...state.visits],
    appointments: [...state.appointments],
    submissions: [...state.submissions],
    billingHandoffs: [...state.billingHandoffs],
    counters: { ...state.counters },
    roster: state.roster,
  };
}

export function FrontdeskStoreProvider({ children }: { children: ReactNode }) {
  const { authReady, session } = useSession();
  const [state, setState] = useState<FrontdeskState>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setReady(false);
    try {
      const snapshot = await getClinicalSnapshotAction();
      setState({
        patients: snapshot.patients,
        visits: snapshot.visits,
        appointments: snapshot.appointments,
        submissions: snapshot.submissions,
        counters: snapshot.counters,
        billingHandoffs: snapshot.billingHandoffs,
        roster: snapshot.roster,
      });
      setError(null);
    } catch (err) {
      console.error("Frontdesk refresh failed:", err);
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
        const snapshot = await getClinicalSnapshotAction();
        if (cancelled) return;
        setState({
          patients: snapshot.patients,
          visits: snapshot.visits,
          appointments: snapshot.appointments,
          submissions: snapshot.submissions,
          counters: snapshot.counters,
          billingHandoffs: snapshot.billingHandoffs,
          roster: snapshot.roster,
        });
        setError(null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 2 && isTransientSessionError(err)) {
          await load(attempt + 1);
          return;
        }
        console.error("Frontdesk refresh failed:", err);
        setError(parseActionError(err).message);
        setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady, session?.branchId, refresh]);

  const update = useCallback((fn: (prev: FrontdeskState) => FrontdeskState) => {
    setState((prev) => fn(cloneState(prev)));
  }, []);

  const registerPatientAsync = useCallback(
    async (
      data: RegisterInput,
      opts?: { startVisit?: boolean; forceDuplicate?: boolean },
    ): Promise<RegisterPatientResult> => {
      const patientId = randomId("p");
      const visitId = opts?.startVisit === false ? "" : randomId("v");
      const uhid = nextUhid(state.counters.patient + 1);

      try {
        const serverResult = await registerPatientAction({
          data,
          patientId,
          visitId: visitId || undefined,
          startVisit: opts?.startVisit,
          forceDuplicate: opts?.forceDuplicate,
        });
        await refresh();
        return {
          ok: true,
          patientId: serverResult.patientId,
          visitId: serverResult.visitId,
          uhid: serverResult.uhid,
        };
      } catch (err) {
        const parsed = parseActionError(err);
        return { ok: false, error: parsed.message, code: parsed.code };
      }
    },
    [refresh, state.counters.patient],
  );

  const checkInVisit = useCallback(
    async (data: CheckInInput, existingVisitId?: string) => {
      const query = String(data.uhid ?? "").trim();
      if (!query) {
        return { ok: false, visitId: "", patientId: "", error: "Search and select a patient by UHID or phone." };
      }
      try {
        const newVisitId = existingVisitId ? undefined : randomId("v");
        const result = await checkInVisitAction({
          data,
          existingVisitId,
          newVisitId,
        });
        if (!result.visitId) {
          return {
            ok: false,
            visitId: "",
            patientId: result.patientId ?? "",
            error: "Patient not found. Select a valid UHID or phone from search.",
          };
        }
        await refresh();
        return { ok: true, visitId: result.visitId, patientId: result.patientId };
      } catch (err) {
        return { ok: false, visitId: "", patientId: "", error: parseActionError(err).message };
      }
    },
    [refresh],
  );

  const processBilling = useCallback(
    async (visitId: string, data: BillingInput): Promise<BillingResult> => {
      try {
        const result = await processBillingAction(visitId, data);
        await refresh({ silent: true });
        return { ok: true, ...result };
      } catch (err) {
        return { ok: false, error: parseActionError(err).message };
      }
    },
    [refresh],
  );

  const processCounselBilling = useCallback(
    async (visitId: string, input: CounselBillingInput): Promise<BillingResult> => {
      try {
        const result = await processCounselBillingAction(visitId, input);
        await refresh({ silent: true });
        return { ok: true, ...result };
      } catch (err) {
        return { ok: false, error: parseActionError(err).message };
      }
    },
    [refresh],
  );

  const completeJuniorExam = useCallback(
    async (visitId: string, data: JuniorExamInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        await completeJuniorExamAction(visitId, data);
        await refresh();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: parseActionError(err).message };
      }
    },
    [refresh],
  );

  const bookAppointment = useCallback(
    async (data: AppointmentInput) => {
      const appointmentId = randomId("ap");
      const visitId = randomId("v");
      const res = await bookAppointmentAction({ data, appointmentId, visitId });
      if (res.error || !res.visitId) {
        return { appointmentId: "", visitId: "", error: res.error ?? "Could not book appointment" };
      }
      await refresh();
      return { appointmentId: res.appointmentId, visitId: res.visitId };
    },
    [refresh],
  );

  const saveSubmission = useCallback(
    async (
      formId: string,
      data: Record<string, string | number | boolean>,
      ctx?: { patientId?: string; visitId?: string },
    ) => {
      await saveSubmissionAction(formId, data, ctx);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const value = useMemo<FrontdeskStoreValue>(() => {
    const getPatient = (id: string) => state.patients.find((p) => p.id === id);
    const getVisit = (id: string) => state.visits.find((v) => v.id === id);

    return {
      ...state,
      ready,
      error,
      refresh,
      resolveDoctorName: (doctorId: string) => rosterDoctorName(doctorId, state.roster),
      getBillingHandoff: (visitId) => state.billingHandoffs.find((h) => h.visitId === visitId),
      registerPatientAsync,
      checkInVisit,
      processBilling,
      processCounselBilling,
      completeJuniorExam,
      bookAppointment,
      saveSubmission,
      getSubmission: (formId, visitId) =>
        state.submissions.find((s) => s.formId === formId && s.visitId === visitId),
      searchPatients: (q) => {
        const query = q.trim().toLowerCase();
        if (!query) return state.patients;
        return state.patients.filter(
          (p) =>
            patientDisplayName(p).toLowerCase().includes(query) ||
            p.uhid.toLowerCase().includes(query) ||
            p.phone.includes(query),
        );
      },
      findDuplicates: (phone, firstName) => findDuplicatePatients(state.patients, phone, firstName),
      getPatient,
      getVisit,
      getPatientVisits: (patientId) => state.visits.filter((v) => v.patientId === patientId),
      getWaitingCheckIns: () =>
        state.visits
          .filter((v) => v.stage === "registered" || (v.stage === "checked_in" && !v.checkInAt))
          .map((v) => ({ visit: v, patient: getPatient(v.patientId)! }))
          .filter((x) => x.patient),
      getPendingBilling: () =>
        state.visits
          .filter((v) => v.stage === "billing" || v.billing === "pending" || v.billing === "deferred")
          .filter((v) => v.stage !== "with_doctor" && v.stage !== "completed")
          .map((v) => ({ visit: v, patient: getPatient(v.patientId)! }))
          .filter((x) => x.patient),
      getQueueVisits: (doctorId) =>
        sortVisitsByToken(
          state.visits.filter(
            (v) =>
              ["queued", "junior_exam"].includes(v.stage) &&
              (!doctorId || v.doctorId === doctorId),
          ),
        ).map((v) => ({
          ...v,
          waitMin: v.checkInAt ? computeWaitMinutes(v.checkInAt) : v.waitMin,
        })),
      getJuniorExamVisits: () =>
        state.visits.filter((v) => ["queued", "junior_exam"].includes(v.stage)),
      getDashboardKpis: () => computeKpis(state.visits),
      getActionItems: () => buildActionItems(state.visits, state.patients),
      resetStore: () => {
        setState(initialState());
        void refresh();
      },
    };
  }, [state, ready, error, refresh, registerPatientAsync, checkInVisit, processBilling, processCounselBilling, completeJuniorExam, bookAppointment, saveSubmission]);

  return <FrontdeskContext.Provider value={value}>{children}</FrontdeskContext.Provider>;
}

export function useFrontdeskStore() {
  const ctx = useContext(FrontdeskContext);
  if (!ctx) throw new Error("useFrontdeskStore must be used within FrontdeskStoreProvider");
  return ctx;
}
