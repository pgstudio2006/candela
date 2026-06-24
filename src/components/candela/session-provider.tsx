"use client";

import type { CandelaRole } from "@/design-system/modules";
import type { AuthDraft, CandelaClientSession } from "@/lib/auth-types";
import { mergeAuthDraft } from "@/lib/auth/draft-cookie";
import {
  fetchAuthDraftFromServer,
  readAuthDraft,
  readClientSession,
  writeAuthDraft,
  writeClientSession,
} from "@/lib/auth-storage";
import { signOut as authSignOut } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type { AuthDraft, CandelaRole };

type Session = CandelaClientSession;

type SessionContextValue = {
  session: Session | null;
  authDraft: AuthDraft | null;
  authReady: boolean;
  setAuthDraft: (draft: AuthDraft | null) => void;
  setSession: (s: Session | null) => void;
  signOut: () => Promise<void>;
  patientDrawerOpen: boolean;
  setPatientDrawerOpen: (o: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (o: boolean) => void;
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function draftFromSession(session: Session): AuthDraft {
  return {
    tenantId: session.tenant,
    tenantName: session.tenantName,
    branchId: session.branchId,
    branchName: session.branchName,
  };
}

async function loadCompatSession() {
  const res = await fetch("/api/session/compat", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error("Session endpoint failed");
  return (await res.json()) as { session: Session | null; authDraft?: AuthDraft | null };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [authDraft, setAuthDraftState] = useState<AuthDraft | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  useEffect(() => {
    const fromStorageSession = readClientSession<Session>();
    const fromStorageDraft = readAuthDraft();
    setAuthDraftState(fromStorageDraft);

    let ignore = false;
    const hydrate = async () => {
      try {
        let json = await loadCompatSession();
        if (!json.session) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          json = await loadCompatSession();
        }
        if (ignore) return;

        const serverDraft = json.authDraft ?? (await fetchAuthDraftFromServer());
        const apiSession = json.session;
        const mergedDraft = mergeAuthDraft(fromStorageDraft, serverDraft, apiSession ? draftFromSession(apiSession) : null);

        const merged =
          apiSession && fromStorageSession
            ? {
                ...apiSession,
                crmOperatorId: fromStorageSession.crmOperatorId ?? apiSession.crmOperatorId,
                pharmacyOperatorId:
                  fromStorageSession.pharmacyOperatorId ?? apiSession.pharmacyOperatorId,
                hrOperatorId: fromStorageSession.hrOperatorId ?? apiSession.hrOperatorId,
              }
            : apiSession ?? fromStorageSession;

        setSessionState(merged);
        if (mergedDraft) {
          setAuthDraftState(mergedDraft);
          writeAuthDraft(mergedDraft);
        } else if (merged) {
          const draft = draftFromSession(merged);
          setAuthDraftState(draft);
          writeAuthDraft(draft);
        }
        if (merged) writeClientSession(merged);
      } catch {
        if (!ignore) {
          setSessionState(fromStorageSession);
          if (fromStorageDraft) setAuthDraftState(fromStorageDraft);
        }
      } finally {
        if (!ignore) setAuthReady(true);
      }
    };

    void hydrate();
    return () => {
      ignore = true;
    };
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    writeClientSession(s);
    if (s) {
      const draft = draftFromSession(s);
      setAuthDraftState(draft);
      writeAuthDraft(draft);
    }
  }, []);

  const setAuthDraft = useCallback((draft: AuthDraft | null) => {
    setAuthDraftState(draft);
    writeAuthDraft(draft);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut({ redirect: false });
    setSessionState(null);
    setAuthDraftState(null);
    writeClientSession(null);
    writeAuthDraft(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      authDraft,
      authReady,
      setAuthDraft,
      setSession,
      signOut,
      patientDrawerOpen,
      setPatientDrawerOpen,
      commandOpen,
      setCommandOpen,
      activePatientId,
      setActivePatientId,
    }),
    [
      session,
      authDraft,
      authReady,
      setAuthDraft,
      setSession,
      signOut,
      patientDrawerOpen,
      commandOpen,
      activePatientId,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
