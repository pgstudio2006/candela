"use client";

import { useSession } from "@/components/candela/session-provider";
import { StoreGate } from "@/components/candela/store-gate";
import { FrontdeskCommandPalette } from "@/components/frontdesk/command-palette";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { WorkspaceSidebar } from "@/components/frontdesk/sidebar";
import { getFrontdeskNavItem } from "@/design-system/frontdesk-nav";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function FrontdeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, signOut, setCommandOpen, commandOpen } = useSession();
  const { ready, error, refresh } = useFrontdeskStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const current = getFrontdeskNavItem(pathname);
  const isDisplayBoard = pathname.startsWith("/app/frontdesk/display");

  useEffect(() => {
    if (!authReady) return;
    if (!session) router.replace("/login");
    else if (session.role !== "frontdesk") router.replace(`/app/${session.role}`);
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

  if (!authReady || !session) return null;

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
        onSignOut={() => { signOut(); router.push("/login"); }}
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
