"use client";

import { StoreGate } from "@/components/candela/store-gate";
import { HrCommandPalette } from "@/components/hr/command-palette";
import { HrSidebar } from "@/components/hr/sidebar";
import { useHrPoll } from "@/hooks/use-hr-poll";
import { useHrStore } from "@/components/hr/hr-store";
import { useSession } from "@/components/candela/session-provider";
import { useRequireClientSession } from "@/hooks/use-require-client-session";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { HR_NAV, getHrNavItem } from "@/design-system/hr-nav";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function HrShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, commandOpen, setCommandOpen } = useSession();
  const { loading: sessionLoading } = useRequireClientSession();
  const { isManager, ready, error, refresh } = useHrStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const current = getHrNavItem(pathname);

  useHrPoll();

  useEffect(() => {
    if (sessionLoading || !session) return;
    if (session.role !== "hr") {
      router.replace(`/app/${session.role}`);
      return;
    }
    if (!session.hrOperatorId) router.replace("/workspace");
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session?.hrOperatorId || !ready) return;
    if (!isManager()) {
      const blocked = HR_NAV.find((n) => n.managerOnly && pathname.startsWith(n.href));
      if (blocked) router.replace("/app/hr");
    }
  }, [pathname, session?.hrOperatorId, isManager, ready, router]);

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

  if (sessionLoading || !session?.hrOperatorId) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--attio-canvas)] text-[var(--attio-text)]" data-candela-app>
      <HrSidebar
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] px-6 py-2 text-[12px] text-[var(--attio-text-secondary)]">
          <span className="font-medium">{session.userName}</span>
          <span className="mx-2">·</span>
          <span>{session.userEmail}</span>
        </div>
        <main className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto">
          <StoreGate ready={ready} error={error} onRetry={() => void refresh()}>
            {children}
          </StoreGate>
        </main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} context={current.label} />
      <HrCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} isManager={isManager()} />
    </div>
  );
}
