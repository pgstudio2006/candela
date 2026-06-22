import type { AuthDraft, CandelaClientSession } from "@/lib/auth-types";

const REMEMBER_KEY = "candela-remember-me";
const DRAFT_KEY = "candela-auth-draft";
const SESSION_KEY = "candela-session";
const EMAIL_KEY = "candela-last-email";
const DRAFT_COOKIE = "candela-auth-draft";

export const WORKSPACE_SIGN_IN_PATH = "/workspace";

export function isRememberMe(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_KEY) === "1";
}

export function setRememberMe(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(REMEMBER_KEY, "1");
  else localStorage.removeItem(REMEMBER_KEY);
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
  if (value === null) store.removeItem(key);
  else store.setItem(key, JSON.stringify(value));
}

export function readAuthDraft(): AuthDraft | null {
  if (typeof window === "undefined") return null;
  return (
    readJson<AuthDraft>(localStorage, DRAFT_KEY) ??
    readJson<AuthDraft>(sessionStorage, DRAFT_KEY)
  );
}

export function writeAuthDraft(draft: AuthDraft | null) {
  if (typeof window === "undefined") return;
  writeJson(localStorage, DRAFT_KEY, draft);
  if (draft) writeJson(sessionStorage, DRAFT_KEY, draft);
  else sessionStorage.removeItem(DRAFT_KEY);
  if (draft) setDraftCookie(draft);
  else clearDraftCookie();
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
  else localStorage.removeItem(SESSION_KEY);
  if (!session) sessionStorage.removeItem(SESSION_KEY);
}

export function readSavedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(EMAIL_KEY) ?? "";
}

export function writeSavedEmail(email: string) {
  if (typeof window === "undefined") return;
  const trimmed = email.trim();
  if (trimmed) localStorage.setItem(EMAIL_KEY, trimmed);
  else localStorage.removeItem(EMAIL_KEY);
}

export function setDraftCookie(draft: AuthDraft) {
  if (typeof document === "undefined") return;
  document.cookie = `${DRAFT_COOKIE}=${encodeURIComponent(JSON.stringify(draft))}; path=/; max-age=31536000; samesite=lax`;
}

export function clearDraftCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${DRAFT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasDraftCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${DRAFT_COOKIE}=`));
}
