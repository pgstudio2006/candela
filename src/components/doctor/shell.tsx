"use client";

import { useSession } from "@/components/candela/session-provider";
import { StoreGate } from "@/components/candela/store-gate";
import { DoctorCommandPalette } from "@/components/doctor/command-palette";
import { useDoctorStore } from "@/components/doctor/doctor-store";
import { DoctorSidebar } from "@/components/doctor/sidebar";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { getDoctorNavItem } from "@/design-system/doctor-nav";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function DoctorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, signOut, setCommandOpen, commandOpen } = useSession();
  const { getOpdQueue, startConsultation, ready, error, refresh } = useDoctorStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const current = getDoctorNavItem(pathname);

  useEffect(() => {
    if (!authReady) return;
    if (!session) router.replace("/login");
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
          router.push("/login");
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
