"use client";

import {
  type Patient,
  type Visit,
} from "@/design-system/frontdesk-data";
import {
  ageFromDob,
  buildActionItems,
  computeKpis,
  deptLabel,
  doctorName,
  findDuplicatePatients,
  matchPatientByQuery,
  nextUhid,
  nowTime,
  templateAmount,
  type Appointment,
  type FormSubmission,
  type FrontdeskCounters,
} from "@/lib/frontdesk-workflow";
import {
  billingFromPayment,
  resolveOpdFirstRoute,
  resolvePostCounselRoute,
  treatmentPathFromConvert,
  type PaymentScope,
} from "@/lib/billing-routing";
import type { BillingHandoffPayload } from "@/design-system/counsellor-data";
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

type FrontdeskState = {
  patients: Patient[];
  visits: Visit[];
  appointments: Appointment[];
  submissions: FormSubmission[];
  counters: FrontdeskCounters;
  billingHandoffs: BillingHandoffPayload[];
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

export type BillingResult = {
  routeHref: string;
  routingLabel: string;
  routingNote: string;
};

type FrontdeskStoreValue = FrontdeskState & {
  ready: boolean;
  getBillingHandoff: (visitId: string) => BillingHandoffPayload | undefined;
  registerPatient: (data: RegisterInput, opts?: { startVisit?: boolean }) => { patientId: string; visitId: string; uhid: string };
  checkInVisit: (data: CheckInInput, visitId?: string) => { visitId: string; patientId: string };
  processBilling: (visitId: string, data: BillingInput) => BillingResult;
  processCounselBilling: (visitId: string, input: CounselBillingInput) => BillingResult;
  completeJuniorExam: (visitId: string, data: JuniorExamInput) => void;
  bookAppointment: (data: AppointmentInput) => { appointmentId: string; visitId: string };
  saveSubmission: (formId: string, data: Record<string, string | number | boolean>, ctx?: { patientId?: string; visitId?: string }) => void;
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
  };
}

export function FrontdeskStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FrontdeskState>(initialState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getClinicalSnapshotAction();
      setState({
        patients: snapshot.patients,
        visits: snapshot.visits,
        appointments: snapshot.appointments,
        submissions: snapshot.submissions,
        counters: snapshot.counters,
        billingHandoffs: snapshot.billingHandoffs,
      });
    } catch (err) {
      console.error("Frontdesk refresh failed:", err);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback((fn: (prev: FrontdeskState) => FrontdeskState) => {
    setState((prev) => fn(cloneState(prev)));
  }, []);

  const registerPatient = useCallback(
    (data: RegisterInput, opts?: { startVisit?: boolean }) => {
      const patientId = randomId("p");
      const visitId = opts?.startVisit === false ? "" : randomId("v");
      const uhid = nextUhid(state.counters.patient + 1);

      update((prev) => {
        const deptId = String(data.department ?? "dept_spine");
        const first = String(data.firstName ?? "").trim();
        const last = String(data.lastName ?? "").trim();
        const name = `${first} ${last}`.trim() || "New Patient";
        const patient: Patient = {
          id: patientId,
          uhid,
          name,
          phone: String(data.phone ?? ""),
          email: String(data.email ?? "") || undefined,
          age: data.dob ? ageFromDob(String(data.dob)) : 0,
          gender: (String(data.gender ?? "O") as Patient["gender"]),
          department: deptLabel(deptId),
          departmentId: deptId,
          tags: [String(data.visitType ?? "opd")],
          balance: 0,
          referrer: String(data.referrerName ?? "") || undefined,
        };
        const patients = [...prev.patients, patient];
        let visits = prev.visits;
        if (visitId) {
          visits = [
            ...prev.visits,
            {
              id: visitId,
              patientId,
              stage: "registered",
              departmentId: deptId,
              doctorId: "",
              doctorName: "",
              billing: "pending",
              exam: "not_started",
              appointment: false,
              waitMin: 0,
            },
          ];
        }
        return {
          ...prev,
          patients,
          visits,
          counters: {
            ...prev.counters,
            patient: prev.counters.patient + 1,
            visit: visitId ? prev.counters.visit + 1 : prev.counters.visit,
          },
        };
      });

      void registerPatientAction({
        data,
        patientId,
        visitId: visitId || undefined,
        startVisit: opts?.startVisit,
      }).then(() => refresh());

      return { patientId, visitId, uhid };
    },
    [refresh, state.counters.patient, update],
  );

  const checkInVisit = useCallback(
    (data: CheckInInput, existingVisitId?: string) => {
      let result = { visitId: existingVisitId ?? "", patientId: "" };
      const newVisitId = existingVisitId ? undefined : randomId("v");

      update((prev) => {
        const query = String(data.uhid ?? "");
        const patient = matchPatientByQuery(prev.patients, query);
        if (!patient) return prev;

        const doctorId = String(data.doctor ?? "dr_1");
        const deptId = String(data.department ?? patient.departmentId);
        let visitId = existingVisitId ?? "";
        let visits = [...prev.visits];

        const existing = existingVisitId
          ? visits.find((v) => v.id === existingVisitId)
          : visits.find(
              (v) =>
                v.patientId === patient.id &&
                ["registered", "checked_in", "billing"].includes(v.stage),
            );

        if (existing) {
          visitId = existing.id;
          visits = visits.map((v) =>
            v.id === existing.id
              ? {
                  ...v,
                  stage: "billing",
                  departmentId: deptId,
                  doctorId,
                  doctorName: doctorName(doctorId),
                  checkInAt: nowTime(),
                  billing: v.billing === "paid" ? v.billing : "pending",
                }
              : v,
          );
        } else {
          visitId = newVisitId ?? randomId("v");
          visits.push({
            id: visitId,
            patientId: patient.id,
            stage: "billing",
            departmentId: deptId,
            doctorId,
            doctorName: doctorName(doctorId),
            billing: "pending",
            exam: "not_started",
            appointment: false,
            waitMin: 0,
            checkInAt: nowTime(),
          });
        }

        result = { visitId, patientId: patient.id };
        return {
          ...prev,
          visits,
          counters: existing ? prev.counters : { ...prev.counters, visit: prev.counters.visit + 1 },
        };
      });
      void checkInVisitAction({
        data,
        existingVisitId,
        newVisitId,
      }).then(() => refresh());
      return result;
    },
    [refresh, update],
  );

  const processBilling = useCallback(
    (visitId: string, data: BillingInput): BillingResult => {
      const mode = String(data.mode ?? "upi");
      const paymentScope = (String(data.paymentScope ?? "full") as PaymentScope) || "full";
      const amount = Number(data.amount ?? templateAmount(String(data.template ?? "bt1")));
      const discount = Number(data.discount ?? 0);
      const net = Math.max(0, amount - discount);
      const collected =
        paymentScope === "partial"
          ? Math.min(net, Math.max(0, Number(data.collectedAmount ?? 0)))
          : paymentScope === "defer"
            ? 0
            : net;
      const route = resolveOpdFirstRoute({ paymentScope, mode, visitId, netAmount: net, collected });

      const token = state.counters.token + 1;
      update((prev) => {
        const billing = billingFromPayment(paymentScope, mode);
        const balanceDue = Math.max(0, net - collected);

        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === prev.visits.find((v) => v.id === visitId)?.patientId
              ? { ...p, balance: p.balance + balanceDue }
              : p,
          ),
          visits: prev.visits.map((v) =>
            v.id === visitId
              ? {
                  ...v,
                  stage: route.stage,
                  billing,
                  token: route.stage === "queued" ? token : v.token,
                  billAmount: net,
                  amountPaid: collected,
                  balanceDue: balanceDue > 0 ? balanceDue : undefined,
                  treatmentPath: "opd",
                  routingNote: route.routingNote,
                  deferredReason:
                    billing === "deferred" ? String(data.deferReason ?? "") : undefined,
                  waitMin: 0,
                }
              : v,
          ),
          counters: route.stage === "queued" ? { ...prev.counters, token } : prev.counters,
        };
      });

      void processBillingAction(visitId, data).then(() => refresh());
      return { routeHref: route.routeHref, routingLabel: route.routingLabel, routingNote: route.routingNote };
    },
    [refresh, state.counters.token, update],
  );

  const processCounselBilling = useCallback(
    (visitId: string, input: CounselBillingInput): BillingResult => {
      const { handoff, paymentScope, convertToIpd, mode } = input;
      const net = handoff.quote.netAmount;
      const collected =
        paymentScope === "partial"
          ? Math.min(net, Math.max(0, input.collectedAmount))
          : paymentScope === "defer"
            ? 0
            : net;
      const balanceDue = Math.max(0, net - collected);
      const route = resolvePostCounselRoute({
        paymentScope,
        convertToIpd,
        netAmount: net,
        collected,
        patientId: handoff.patientId,
        visitId,
      });
      const treatmentPath = treatmentPathFromConvert(
        convertToIpd,
        handoff.treatmentMode === "daycare" ? "daycare" : "opd",
      );

      let ipdAdmissionId: string | undefined;
      if (convertToIpd) {
        ipdAdmissionId = `ipd_${visitId}`;
      }

      update((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.id === handoff.patientId ? { ...p, balance: p.balance + balanceDue } : p,
        ),
        visits: prev.visits.map((v) =>
          v.id === visitId
            ? {
                ...v,
                stage: route.stage,
                billing: route.billing,
                billAmount: net,
                amountPaid: collected,
                balanceDue: balanceDue > 0 ? balanceDue : undefined,
                treatmentPath,
                ipdAdmissionId,
                counselPackageLabel: handoff.quote.packageLabel,
                routingNote: route.routingNote,
                deferredReason:
                  route.billing === "deferred" ? input.deferReason ?? "Post-counsel defer" : undefined,
              }
            : v,
        ),
        billingHandoffs: prev.billingHandoffs.filter((h) => h.visitId !== visitId),
      }));

      void processCounselBillingAction(visitId, input).then(() => refresh());

      return { routeHref: route.routeHref, routingLabel: route.routingLabel, routingNote: route.routingNote };
    },
    [refresh, update],
  );

  const completeJuniorExam = useCallback(
    (visitId: string, _data: JuniorExamInput) => {
      update((prev) => ({
        ...prev,
        visits: prev.visits.map((v) =>
          v.id === visitId
            ? { ...v, stage: "with_doctor", exam: "done" as const }
            : v,
        ),
      }));
      void completeJuniorExamAction(visitId).then(() => refresh());
    },
    [refresh, update],
  );

  const bookAppointment = useCallback(
    (data: AppointmentInput) => {
      const appointmentId = randomId("ap");
      const visitId = randomId("v");
      let result = { appointmentId, visitId };
      update((prev) => {
        const patient =
          matchPatientByQuery(prev.patients, String(data.patient ?? "")) ??
          prev.patients.find((p) => p.name.toLowerCase().includes(String(data.patient ?? "").toLowerCase()));

        if (!patient) return prev;

        const doctorId = String(data.doctor ?? "dr_1");
        const deptId = String(data.department ?? "dept_spine");

        const appointment: Appointment = {
          id: appointmentId,
          patientId: patient.id,
          departmentId: deptId,
          doctorId,
          doctorName: doctorName(doctorId),
          date: String(data.date ?? ""),
          time: String(data.time ?? ""),
          durationMin: Number(data.duration ?? 20),
          notes: String(data.notes ?? "") || undefined,
          status: "booked",
        };

        return {
          ...prev,
          appointments: [...prev.appointments, appointment],
          visits: [
            ...prev.visits,
            {
              id: visitId,
              patientId: patient.id,
              stage: "registered",
              departmentId: deptId,
              doctorId,
              doctorName: doctorName(doctorId),
              billing: "pending",
              exam: "not_started",
              appointment: true,
              appointmentTime: String(data.time ?? ""),
              waitMin: 0,
            },
          ],
          counters: {
            ...prev.counters,
            appointment: prev.counters.appointment + 1,
            visit: prev.counters.visit + 1,
          },
        };
      });
      void bookAppointmentAction({
        data,
        appointmentId,
        visitId,
      }).then(() => refresh());
      return result;
    },
    [refresh, update],
  );

  const saveSubmission = useCallback(
    (
      formId: string,
      data: Record<string, string | number | boolean>,
      ctx?: { patientId?: string; visitId?: string },
    ) => {
      update((prev) => ({
        ...prev,
        submissions: [
          ...prev.submissions.filter(
            (s) => !(s.formId === formId && s.visitId === ctx?.visitId),
          ),
          {
            id: `sub_${Date.now()}`,
            formId,
            patientId: ctx?.patientId,
            visitId: ctx?.visitId,
            data,
            submittedAt: new Date().toISOString(),
          },
        ],
      }));
      void saveSubmissionAction(formId, data, ctx).then(() => refresh());
    },
    [refresh, update],
  );

  const value = useMemo<FrontdeskStoreValue>(() => {
    const getPatient = (id: string) => state.patients.find((p) => p.id === id);
    const getVisit = (id: string) => state.visits.find((v) => v.id === id);

    return {
      ...state,
      ready,
      getBillingHandoff: (visitId) => state.billingHandoffs.find((h) => h.visitId === visitId),
      registerPatient,
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
            p.name.toLowerCase().includes(query) ||
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
        state.visits.filter(
          (v) =>
            ["queued", "junior_exam"].includes(v.stage) &&
            (!doctorId || v.doctorId === doctorId),
        ),
      getJuniorExamVisits: () =>
        state.visits.filter((v) => ["queued", "junior_exam"].includes(v.stage)),
      getDashboardKpis: () => computeKpis(state.visits),
      getActionItems: () => buildActionItems(state.visits, state.patients),
      resetStore: () => {
        setState(initialState());
        void refresh();
      },
    };
  }, [state, ready, registerPatient, checkInVisit, processBilling, processCounselBilling, completeJuniorExam, bookAppointment, saveSubmission, refresh]);

  return <FrontdeskContext.Provider value={value}>{children}</FrontdeskContext.Provider>;
}

export function useFrontdeskStore() {
  const ctx = useContext(FrontdeskContext);
  if (!ctx) throw new Error("useFrontdeskStore must be used within FrontdeskStoreProvider");
  return ctx;
}
