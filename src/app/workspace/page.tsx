"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { Button } from "@/components/ui/button";
import { getWorkspace } from "@/design-system/workspace-config";
import type { CandelaRole } from "@/design-system/modules";
import { validateCounsellorLoginAction } from "@/server/counsellor/actions";
import { validateCrmLoginAction } from "@/server/crm/actions";
import { validatePharmacyLoginAction } from "@/server/pharmacy/actions";
import { validateHrLoginAction } from "@/server/hr/actions";
import { cn } from "@/lib/utils";
import { ChevronLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";

export default function WorkspacePage() {
  const router = useRouter();
  const { authDraft, authReady, session, setAuthDraft, setSession } = useSession();
  const [email, setEmail] = useState("staff@navayu.in");
  const [password, setPassword] = useState("demo2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (session) {
      router.replace(getWorkspace(session.role).homePath);
      return;
    }
    if (!authDraft?.tenantId) router.replace("/tenant");
    else if (!authDraft.branchId) router.replace("/branch");
  }, [authDraft, authReady, session, router]);

  const signInToWorkspace = async (e: FormEvent) => {
    e.preventDefault();
    if (!authDraft?.branchId || !authDraft.branchName) return;
    setError("");
    setLoading(true);

    try {
      const authResult = await signIn("credentials", {
        email: email.trim(),
        password,
        branchId: authDraft.branchId,
        redirect: false,
      });
      if (authResult?.error) {
        setError("Invalid email or password.");
        return;
      }

      const res = await fetch("/api/session/compat", { cache: "no-store" });
      const { session: jwtSession } = (await res.json()) as {
        session: {
          role: CandelaRole;
          userEmail: string;
          userName: string;
          branchId: string;
          branchName: string;
          tenant: string;
          tenantName: string;
        } | null;
      };

      if (!jwtSession?.role) {
        setError("Could not load workspace role from session.");
        return;
      }

      const role = jwtSession.role;
      let crmOperatorId: string | undefined;
      let pharmacyOperatorId: string | undefined;
      let hrOperatorId: string | undefined;

      if (role === "crm") {
        const result = await validateCrmLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        crmOperatorId = result.operatorId;
      }
      if (role === "pharmacy") {
        const result = await validatePharmacyLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        pharmacyOperatorId = result.operatorId;
      }
      if (role === "hr") {
        const result = await validateHrLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        hrOperatorId = result.operatorId;
      }
      if (role === "counsellor") {
        const result = await validateCounsellorLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }

      setSession({
        tenant: jwtSession.tenant,
        tenantName: jwtSession.tenantName,
        branchId: jwtSession.branchId,
        branchName: jwtSession.branchName,
        role,
        userName: jwtSession.userName || email.trim(),
        userEmail: jwtSession.userEmail || email.trim(),
        crmOperatorId,
        pharmacyOperatorId,
        hrOperatorId,
      });
      setAuthDraft(null);
      router.replace(getWorkspace(role).homePath);
    } finally {
      setLoading(false);
    }
  };

  const ws = getWorkspace("frontdesk");

  return (
    <GlassAuthShell
      step={4}
      title="Sign in to workspace"
      subtitle={`${authDraft?.branchName ?? ""} · role is assigned from your account`}
      cardClassName="max-w-[400px]"
    >
      <Link
        href="/branch"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ChevronLeft className="size-4" />
        Change branch
      </Link>

      <form className="space-y-4" onSubmit={signInToWorkspace}>
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-700">
          <p className="font-medium">Your workspace role comes from your account</p>
          <p className="mt-1">Use the email/password for the module you need (front desk, doctor, HR, etc.). You will land in the workspace matching your assigned role.</p>
        </div>

        <GlassIconField
          icon={Mail}
          type="email"
          placeholder="Work email"
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
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className={cn(glassButtonClass, "mt-2")}>
          {loading ? "Signing in…" : `Enter ${ws.shortLabel} workspace`}
        </Button>
      </form>
    </GlassAuthShell>
  );
}
