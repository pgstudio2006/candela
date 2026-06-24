"use client";

import { useSession } from "@/components/candela/session-provider";
import type { CandelaClientSession } from "@/lib/auth-types";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Hydrates client session from the JWT cookie when local storage is blocked (Safari / mobile). */
export function useRequireClientSession() {
  const { session, authReady, setSession } = useSession();
  const router = useRouter();
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (session) return;

    let cancelled = false;
    setRecovering(true);

    void fetch("/api/session/compat", { cache: "no-store", credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { session: CandelaClientSession | null }) => {
        if (cancelled) return;
        if (data.session?.role && data.session.branchId) {
          setSession(data.session);
          return;
        }
        router.replace(WORKSPACE_SIGN_IN_PATH);
      })
      .catch(() => {
        if (!cancelled) router.replace(WORKSPACE_SIGN_IN_PATH);
      })
      .finally(() => {
        if (!cancelled) setRecovering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, session, router, setSession]);

  return {
    session,
    authReady,
    loading: !authReady || recovering || !session,
  };
}
