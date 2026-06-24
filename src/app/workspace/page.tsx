"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { Button } from "@/components/ui/button";
import { getWorkspace } from "@/design-system/workspace-config";
import type { CandelaRole } from "@/design-system/modules";
import { mergeAuthDraft } from "@/lib/auth/draft-cookie";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import {
  isRememberMe,
  readSavedEmail,
  setRememberMe,
  writeSavedEmail,
  WORKSPACE_SIGN_IN_PATH,
} from "@/lib/auth-storage";
import { validateCounsellorLoginAction } from "@/server/counsellor/actions";
import { validateCrmLoginAction } from "@/server/crm/actions";
import { validatePharmacyLoginAction } from "@/server/pharmacy/actions";
import { validateHrLoginAction } from "@/server/hr/actions";
import { cn } from "@/lib/utils";
import { ChevronLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AuthDraft } from "@/lib/auth-types";

export default function WorkspacePage() {
  const router = useRouter();
  const { authDraft, authReady, session, setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeState] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jwtDraft, setJwtDraft] = useState<AuthDraft | null>(null);

  const [previewRole, setPreviewRole] = useState<CandelaRole | null>(null);

  const effectiveDraft = useMemo(
    () => mergeAuthDraft(authDraft, jwtDraft),
    [authDraft, jwtDraft],
  );

  const missingBranch = authReady && !effectiveDraft?.branchId;

  useEffect(() => {
    setEmail(readSavedEmail());
    setRememberMeState(isRememberMe());
  }, []);

  useEffect(() => {
    void fetch("/api/session/compat", { cache: "no-store", credentials: "same-origin" })
      .then((res) => res.json())
      .then(
        (data: {
          session?: {
            role?: CandelaRole;
            tenant?: string;
            tenantName?: string;
            branchId?: string;
            branchName?: string;
          } | null;
          authDraft?: AuthDraft | null;
        }) => {
          if (data.session?.role) setPreviewRole(data.session.role);
          if (data.authDraft) setJwtDraft(data.authDraft);
          else if (data.session?.tenant && data.session.tenantName) {
            setJwtDraft({
              tenantId: data.session.tenant,
              tenantName: data.session.tenantName,
              branchId: data.session.branchId,
              branchName: data.session.branchName,
            });
          }
        },
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (session) {
      const needsOperator =
        session.role === "pharmacy" || session.role === "crm" || session.role === "hr";
      const hasOperator =
        (session.role === "pharmacy" && session.pharmacyOperatorId) ||
        (session.role === "crm" && session.crmOperatorId) ||
        (session.role === "hr" && session.hrOperatorId) ||
        !needsOperator;
      if (hasOperator) {
        router.replace(getWorkspace(session.role).homePath);
      } else if (session.userEmail && !email) {
        setEmail(session.userEmail);
      }
      return;
    }
    const next = resolvePostAuthPath(null, effectiveDraft);
    if (next && next !== WORKSPACE_SIGN_IN_PATH) {
      router.replace(next);
    }
  }, [effectiveDraft, authReady, session, router, email]);

  const signInToWorkspace = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveDraft?.branchId || !effectiveDraft.branchName) {
      setError("Select a branch before signing in. Tap “Choose branch” below.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      setRememberMe(rememberMe);
      if (rememberMe) writeSavedEmail(email);

      const authResult = await signIn("credentials", {
        email: email.trim(),
        password,
        branchId: effectiveDraft.branchId,
        redirect: false,
      });
      if (authResult?.error) {
        setError("Invalid email or password for this branch.");
        return;
      }

      const res = await fetch("/api/session/compat", { cache: "no-store", credentials: "same-origin" });
      const { session: jwtSession } = (await res.json()) as {
        session: {
          role: CandelaRole;
          userEmail: string;
          userName: string;
          branchId: string;
          branchName: string;
          tenant: string;
          tenantName: string;
          crmOperatorId?: string;
          pharmacyOperatorId?: string;
          hrOperatorId?: string;
        } | null;
      };

      if (!jwtSession?.role) {
        setError("Could not load workspace role. Check cookies are enabled and try again.");
        return;
      }

      const role = jwtSession.role;
      let crmOperatorId = jwtSession.crmOperatorId;
      let pharmacyOperatorId = jwtSession.pharmacyOperatorId;
      let hrOperatorId = jwtSession.hrOperatorId;

      if (role === "crm" && !crmOperatorId) {
        const result = await validateCrmLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        crmOperatorId = result.operatorId;
      }
      if (role === "pharmacy" && !pharmacyOperatorId) {
        const result = await validatePharmacyLoginAction(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        pharmacyOperatorId = result.operatorId;
      }
      if (role === "hr" && !hrOperatorId) {
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
      router.replace(getWorkspace(role).homePath);
    } finally {
      setLoading(false);
    }
  };

  const ws = getWorkspace(previewRole ?? session?.role ?? "frontdesk");

  return (
    <GlassAuthShell
      step={4}
      title="Sign in to workspace"
      subtitle={`${effectiveDraft?.branchName ?? "No branch selected"} · role is assigned from your account`}
      cardClassName="max-w-[400px]"
    >
      <Link
        href={effectiveDraft?.tenantId ? "/branch" : "/tenant"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ChevronLeft className="size-4" />
        {effectiveDraft?.tenantId ? "Choose branch" : "Set up organization"}
      </Link>

      {missingBranch && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-900">
          <p className="font-medium">Branch not saved on this device</p>
          <p className="mt-1">
            This can happen on Safari or mobile when storage is restricted. Choose your organization and branch again, then sign in.
          </p>
          <Link
            href="/branch"
            className="mt-2 inline-block text-[12px] font-semibold text-amber-950 underline"
          >
            Go to branch selection
          </Link>
        </div>
      )}

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

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMeState(e.target.checked)}
            className="size-4 rounded border-zinc-300"
          />
          Remember me on this device
        </label>

        {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}

        <Button
          type="submit"
          disabled={loading || missingBranch}
          className={cn(glassButtonClass, "mt-2")}
        >
          {loading ? "Signing in…" : `Enter ${ws.shortLabel} workspace`}
        </Button>
      </form>
    </GlassAuthShell>
  );
}
