"use client";

import type { CandelaRole } from "@/design-system/modules";
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

export type { CandelaRole };

export type AuthDraft = {
  tenantId: string;
  tenantName: string;
  branchId?: string;
  branchName?: string;
};

type Session = {
  tenant: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  role: CandelaRole;
  userName: string;
  userEmail: string;
  /** Set when role is crm — maps login to manager or agent workspace */
  crmOperatorId?: string;
  /** Set when role is pharmacy */
  pharmacyOperatorId?: string;
  /** Set when role is hr */
  hrOperatorId?: string;
};

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

const SESSION_KEY = "candela-session";
const DRAFT_KEY = "candela-auth-draft";

function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [authDraft, setAuthDraftState] = useState<AuthDraft | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  useEffect(() => {
    const fromStorageSession = readStorage<Session>(SESSION_KEY);
    const fromStorageDraft = readStorage<AuthDraft>(DRAFT_KEY);

    setAuthDraftState(fromStorageDraft);

    let ignore = false;
    const hydrate = async () => {
      try {
        const res = await fetch("/api/session/compat", { cache: "no-store" });
        if (!res.ok) throw new Error("Session endpoint failed");
        const json = (await res.json()) as { session: Session | null };
        if (ignore) return;
        const apiSession = json.session;
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
        if (merged) sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
      } catch {
        if (!ignore) setSessionState(fromStorageSession);
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
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const setAuthDraft = useCallback((draft: AuthDraft | null) => {
    setAuthDraftState(draft);
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut({ redirect: false });
    setSession(null);
    setAuthDraft(null);
  }, [setSession, setAuthDraft]);

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
