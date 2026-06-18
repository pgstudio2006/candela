"use client";

import { useSession } from "@/components/candela/session-provider";
import { NurseCommandPalette } from "@/components/nurse/command-palette";
import { NurseSidebar } from "@/components/nurse/sidebar";
import { CopilotPanel } from "@/components/frontdesk/copilot-panel";
import { getNurseNavItem } from "@/design-system/nurse-nav";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function NurseShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authReady, signOut, setCommandOpen, commandOpen } = useSession();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const current = getNurseNavItem(pathname);

  useEffect(() => {
    if (!authReady) return;
    if (!session) router.replace("/login");
    else if (session.role !== "nurse") router.replace(`/app/${session.role}`);
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

  if (!authReady || !session) return null;

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
          router.push("/login");
        }}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <main className="scrollbar-none min-w-0 flex-1 overflow-y-auto">{children}</main>
        <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} context={current.label} />
      </div>
      <NurseCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
