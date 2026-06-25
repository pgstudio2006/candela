"use client";

import { useSession } from "@/components/candela/session-provider";
import { useRequireClientSession } from "@/hooks/use-require-client-session";
import { StoreGate } from "@/components/candela/store-gate";
import { FrontdeskCommandPalette } from "@/components/frontdesk/command-palette";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { WorkspaceSidebar } from "@/components/frontdesk/sidebar";
import { getFrontdeskNavItem } from "@/design-system/frontdesk-nav";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { normalizeRegisterPatientInput } from "@/lib/frontdesk-validation";
import type { CopilotAction } from "@/lib/ai/scribe-types";
import { useToast } from "@/components/ui/toast-provider";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function FrontdeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, setCommandOpen, commandOpen } = useSession();
  const { loading: sessionLoading } = useRequireClientSession();
  const { ready, error, refresh, registerPatientAsync, saveSubmission } = useFrontdeskStore();
  const { toast } = useToast();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const current = getFrontdeskNavItem(pathname);
  const isDisplayBoard = pathname.startsWith("/app/frontdesk/display");

  useEffect(() => {
    if (sessionLoading || !session) return;
    if (session.role !== "frontdesk") router.replace(`/app/${session.role}`);
  }, [session, sessionLoading, router]);

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

  const handleCopilotAction = useCallback(
    (action: CopilotAction) => {
      if (action.type !== "register_patient") return;
      void (async () => {
        const data = normalizeRegisterPatientInput(action.data);
        if (!data.department) data.department = "dept_spine";
        const result = await registerPatientAsync(data, { startVisit: true });
        if (!result.ok) {
          toast(result.error ?? "Registration failed", "error");
          if (result.code === "DUPLICATE_PHONE" || result.code === "DUPLICATE_PATIENT") {
            router.push("/app/frontdesk/check-in");
          } else {
            router.push("/app/frontdesk/registration");
          }
          return;
        }
        if (result.visitId) {
          await saveSubmission("registration", data, {
            patientId: result.patientId,
            visitId: result.visitId,
          });
        }
        toast(`Registered ${result.uhid}`, "success");
        router.push(
          result.visitId
            ? `/app/frontdesk/check-in?visit=${result.visitId}&patient=${result.patientId}`
            : `/app/frontdesk/patients/${result.patientId}`,
        );
      })();
    },
    [registerPatientAsync, saveSubmission, router, toast],
  );

  if (sessionLoading || !session) return null;

  if (isDisplayBoard) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white" data-candela-app>
        <StoreGate ready={ready} error={error} onRetry={() => void refresh()}>
          {children}
        </StoreGate>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--attio-canvas)] text-[var(--attio-text)]"
      data-candela-app
    >
      <WorkspaceSidebar
        branchName={session.branchName}
        userName={session.userName}
        copilotOpen={copilotOpen}
        settingsRef={settingsRef}
        onToggleCopilot={() => setCopilotOpen((o) => !o)}
        onOpenCommand={() => setCommandOpen(true)}
        onSignOut={() => { signOut(); router.push(WORKSPACE_SIGN_IN_PATH); }}
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
          module="frontdesk"
          page={pathname}
          onAgentAction={handleCopilotAction}
        />
      </div>

      <FrontdeskCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenSettings={openSettings}
      />
    </div>
  );
}
