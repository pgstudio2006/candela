"use client";

import { useSession } from "@/components/candela/session-provider";
import { StoreGate } from "@/components/candela/store-gate";
import { DoctorCommandPalette } from "@/components/doctor/command-palette";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { DoctorSidebar } from "@/components/doctor/sidebar";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
import type { CopilotAction } from "@/lib/ai/scribe-types";
import { getDoctorNavItem } from "@/design-system/doctor-nav";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export function DoctorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, signOut, setCommandOpen, commandOpen } = useSession();
  const {
    getOpdQueue,
    startConsultation,
    getConsultation,
    getVisit,
    getPatient,
    saveConsultSection,
    setPrescription,
    ready,
    error,
    refresh,
  } = useDoctorStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const current = getDoctorNavItem(pathname);

  const visitId = useMemo(() => {
    const match = pathname.match(/\/consult\/([^/]+)/);
    return match?.[1];
  }, [pathname]);

  const consult = visitId ? getConsultation(visitId) : undefined;
  const visit = visitId ? getVisit(visitId) : undefined;
  const patient = visit ? getPatient(visit.patientId) : undefined;

  const queueSummary = useMemo(() => {
    const queue = getOpdQueue();
    const nextPatient = queue[0] ? getPatient(queue[0].patientId) : undefined;
    return `${queue.length} patient(s) in OPD queue${nextPatient ? ` · next: ${patientDisplayName(nextPatient)}` : ""}`;
  }, [getOpdQueue, getPatient]);

  useEffect(() => {
    if (!authReady) return;
    if (!session) router.replace(WORKSPACE_SIGN_IN_PATH);
    else if (session.role !== "doctor") router.replace(`/app/${session.role}`);
  }, [session, authReady, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  const openSettings = useCallback(() => {
    settingsRef.current?.scrollIntoView({ block: "nearest" });
    settingsRef.current?.focus();
  }, []);

  const startNextConsult = useCallback(() => {
    const next = getOpdQueue()[0];
    if (next) {
      startConsultation(next.id);
      router.push(`/app/doctor/consult/${next.id}`);
    } else {
      router.push("/app/doctor/queue");
    }
  }, [getOpdQueue, router, startConsultation]);

  const onAgentAction = useCallback(
    (action: CopilotAction) => {
      if (action.type === "fill_section" && action.visitId) {
        saveConsultSection(action.visitId, action.section, action.data);
      }
      if (action.type === "set_prescription" && action.visitId) {
        setPrescription(
          action.visitId,
          action.lines.map((line, i) => ({ ...line, id: `rx_copilot_${Date.now()}_${i}` })),
        );
      }
    },
    [saveConsultSection, setPrescription],
  );

  if (!authReady || !session) return null;

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--attio-canvas)] text-[var(--attio-text)]"
      data-candela-app
    >
      <DoctorSidebar
        branchName={session.branchName}
        userName={session.userName}
        copilotOpen={copilotOpen}
        settingsRef={settingsRef}
        onToggleCopilot={() => setCopilotOpen((o) => !o)}
        onOpenCommand={() => setCommandOpen(true)}
        onSignOut={() => {
          signOut();
          router.push(WORKSPACE_SIGN_IN_PATH);
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <main className="scrollbar-none min-w-0 flex-1 overflow-y-auto">
          <StoreGate ready={ready} error={error} onRetry={() => void refresh()}>
            {children}
          </StoreGate>
        </main>
        <CopilotPanel
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          context={current.label}
          module="doctor"
          page={pathname}
          visitId={visitId}
          patient={
            patient
              ? { name: patient.name, uhid: patient.uhid, age: patient.age }
              : undefined
          }
          queueSummary={queueSummary}
          consultSnapshot={
            consult
              ? {
                  examination: consult.examination,
                  diagnosis: consult.diagnosis,
                  treatment: consult.treatment,
                  prescription: consult.prescription,
                  transcript: consult.scribeTranscript,
                }
              : undefined
          }
          onAgentAction={onAgentAction}
        />
      </div>

      <DoctorCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenSettings={openSettings}
        onStartNext={startNextConsult}
      />
    </div>
  );
}
