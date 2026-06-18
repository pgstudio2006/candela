"use client";

import { useSession } from "@/components/candela/session-provider";
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
    if (!session) router.replace("/login");
  }, [session, authReady, router]);

  if (!authReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (hasOwnShell) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-8 text-center">
      <div>
        <p className="text-lg font-semibold text-zinc-900">Workspace coming soon</p>
        <p className="mt-2 text-sm text-zinc-500">
          {session.role} module is next in the build queue.
        </p>
      </div>
    </div>
  );
}
