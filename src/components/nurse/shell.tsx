"use client";

import { useSession } from "@/components/candela/session-provider";
import { useRequireClientSession } from "@/hooks/use-require-client-session";
import { StoreGate } from "@/components/candela/store-gate";
import { useNurseStore } from "@/components/nurse/nurse-store";
import { NurseCommandPalette } from "@/components/nurse/command-palette";
import { NurseSidebar } from "@/components/nurse/sidebar";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { getNurseNavItem } from "@/design-system/nurse-nav";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function NurseShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, setCommandOpen, commandOpen } = useSession();
  const { loading: sessionLoading } = useRequireClientSession();
  const { ready, error, refresh } = useNurseStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const current = getNurseNavItem(pathname);

  useEffect(() => {
    if (sessionLoading || !session) return;
    if (session.role !== "nurse") router.replace(`/app/${session.role}`);
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

  if (sessionLoading || !session) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--attio-canvas)] text-[var(--attio-text)]" data-candela-app>
      <NurseSidebar
        branchName={session.branchName}
        userName={session.userName}
        copilotOpen={copilotOpen}
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
        <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} context={current.label} />
      </div>
      <NurseCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
