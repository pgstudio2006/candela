"use client";

import { useSession } from "@/components/candela/session-provider";
import { getWorkspace } from "@/design-system/workspace-config";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/** Session guard only — workspace layouts provide their own shell */
export function AppShell({ children }: { children: ReactNode }) {
  const { session, authReady } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const hasOwnShell =
    pathname.startsWith("/app/frontdesk") ||
    pathname.startsWith("/app/doctor") ||
    pathname.startsWith("/app/counsellor") ||
    pathname.startsWith("/app/nurse") ||
    pathname.startsWith("/app/admin") ||
    pathname.startsWith("/app/crm") ||
    pathname.startsWith("/app/pharmacy") ||
    pathname.startsWith("/app/hr");

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!hasOwnShell) {
      router.replace(getWorkspace(session.role).homePath);
    }
  }, [session, authReady, hasOwnShell, router]);

  if (!authReady || !session || !hasOwnShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
