import type { AuthDraft, CandelaClientSession } from "@/lib/auth-types";
import { DRAFT_COOKIE_NAME, parseAuthDraftCookie } from "@/lib/auth/draft-cookie";

const REMEMBER_KEY = "candela-remember-me";
const DRAFT_KEY = "candela-auth-draft";
const SESSION_KEY = "candela-session";
const EMAIL_KEY = "candela-last-email";

export const WORKSPACE_SIGN_IN_PATH = "/workspace";

export function isRememberMe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRememberMe(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Safari private mode / blocked storage
  }
}

function sessionStore(): Storage {
  if (typeof window === "undefined") return sessionStorage;
  return isRememberMe() ? localStorage : sessionStorage;
}

function readJson<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage, key: string, value: unknown) {
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or blocked — server cookie + JWT remain the source of truth.
  }
}

function readDraftFromDocumentCookie(): AuthDraft | null {
  if (typeof document === "undefined") return null;
  try {
    const entry = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${DRAFT_COOKIE_NAME}=`));
    if (!entry) return null;
    const value = entry.slice(DRAFT_COOKIE_NAME.length + 1);
    return parseAuthDraftCookie(value);
  } catch {
    return null;
  }
}

export function readAuthDraft(): AuthDraft | null {
  if (typeof window === "undefined") return null;
  return (
    readJson<AuthDraft>(localStorage, DRAFT_KEY) ??
    readJson<AuthDraft>(sessionStorage, DRAFT_KEY) ??
    readDraftFromDocumentCookie()
  );
}

export async function fetchAuthDraftFromServer(): Promise<AuthDraft | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch("/api/auth/draft", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const json = (await res.json()) as { draft?: AuthDraft | null };
    return json.draft ?? null;
  } catch {
    return null;
  }
}

function syncAuthDraftToServer(draft: AuthDraft | null) {
  if (typeof fetch === "undefined") return;
  void fetch("/api/auth/draft", {
    method: draft ? "POST" : "DELETE",
    headers: draft ? { "Content-Type": "application/json" } : undefined,
    body: draft ? JSON.stringify(draft) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
}

export function writeAuthDraft(draft: AuthDraft | null) {
  if (typeof window === "undefined") return;
  writeJson(localStorage, DRAFT_KEY, draft);
  if (draft) writeJson(sessionStorage, DRAFT_KEY, draft);
  else sessionStorage.removeItem(DRAFT_KEY);
  syncAuthDraftToServer(draft);
}

export function readClientSession<T>(): T | null {
  if (typeof window === "undefined") return null;
  return (
    readJson<T>(sessionStore(), SESSION_KEY) ??
    readJson<T>(localStorage, SESSION_KEY) ??
    readJson<T>(sessionStorage, SESSION_KEY)
  );
}

export function writeClientSession<T>(session: T | null) {
  if (typeof window === "undefined") return;
  const primary = sessionStore();
  writeJson(primary, SESSION_KEY, session);
  if (isRememberMe()) writeJson(localStorage, SESSION_KEY, session);
  else {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
  if (!session) {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

export function readSavedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeSavedEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = email.trim();
    if (trimmed) localStorage.setItem(EMAIL_KEY, trimmed);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function hasDraftCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${DRAFT_COOKIE_NAME}=`));
}
