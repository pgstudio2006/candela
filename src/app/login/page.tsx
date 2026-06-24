"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { Button } from "@/components/ui/button";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import { readAuthDraft, readSavedEmail, writeAuthDraft } from "@/lib/auth-storage";
import type { CandelaRole } from "@/design-system/modules";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    setEmail(readSavedEmail());
  }, []);

  useEffect(() => {
    let ignore = false;
    const hydrate = async () => {
      try {
        const res = await fetch("/api/session/compat", { cache: "no-store" });
        if (!res.ok) return;
        const { session, authDraft: serverDraft } = (await res.json()) as {
          session: {
            role: CandelaRole;
            branchId?: string;
            tenant?: string;
            tenantName?: string;
            branchName?: string;
          } | null;
          authDraft?: {
            tenantId: string;
            tenantName: string;
            branchId?: string;
            branchName?: string;
          } | null;
        };
        if (ignore) return;
        const draft = readAuthDraft() ?? serverDraft;
        const next = resolvePostAuthPath(session, draft);
        if (next) {
          window.location.replace(next);
          return;
        }
      } finally {
        if (!ignore) setCheckingSession(false);
      }
    };
    void hydrate();
    const timeout = window.setTimeout(() => setCheckingSession(false), 10_000);
    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [router]);

  if (checkingSession) {
    return (
      <GlassAuthShell
        step={1}
        title="Sign in with email"
        subtitle="Candela by Adrine — healthcare operating system for clinics and hospitals."
      >
        <p className="text-center text-sm text-zinc-500">Loading…</p>
      </GlassAuthShell>
    );
  }

  return (
    <GlassAuthShell
      step={1}
      title="Sign in with email"
      subtitle="Step 1 of 4 — platform access, then organization, branch, and workspace."
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError("");
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          if (result?.error) {
            setLoading(false);
            setError("Invalid email or password.");
            return;
          }

          const res = await fetch("/api/session/compat", { cache: "no-store", credentials: "same-origin" });
          const { session: jwtSession, authDraft: serverDraft } = (await res.json()) as {
            session: {
              role: CandelaRole;
              branchId?: string;
              tenant?: string;
              tenantName?: string;
              branchName?: string;
            } | null;
            authDraft?: { tenantId: string; tenantName: string; branchId?: string; branchName?: string } | null;
          };

          const draft = readAuthDraft();
          const effectiveDraft =
            serverDraft ??
            draft ??
            (jwtSession?.tenant && jwtSession.tenantName
              ? {
                  tenantId: jwtSession.tenant,
                  tenantName: jwtSession.tenantName,
                  branchId: jwtSession.branchId,
                  branchName: jwtSession.branchName,
                }
              : null);

          if (effectiveDraft) writeAuthDraft(effectiveDraft);

          router.refresh();
          setLoading(false);
          const next = resolvePostAuthPath(jwtSession, effectiveDraft) ?? "/tenant";
          router.replace(next);
        }}
      >
        <GlassIconField
          icon={Mail}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <GlassIconField
          icon={Lock}
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/60 hover:text-zinc-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" className={cn(glassButtonClass, "mt-2")}>
          <LogIn className="mr-2 size-4" />
          {loading ? "Signing in..." : "Continue"}
        </Button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </form>
    </GlassAuthShell>
  );
}
