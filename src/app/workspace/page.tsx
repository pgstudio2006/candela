"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKSPACES } from "@/design-system/workspace-config";
import type { CandelaRole } from "@/design-system/modules";
import { COUNSELLOR_MANAGER_EMAIL } from "@/lib/counsellor-auth";
import { CRM_MANAGER_EMAIL } from "@/lib/crm-auth";
import { PHARMACY_MANAGER_EMAIL } from "@/lib/pharmacy-auth";
import { HR_MANAGER_EMAIL } from "@/lib/hr-auth";
import { cn } from "@/lib/utils";
import { validateCounsellorLoginAction } from "@/server/counsellor/actions";
import { validateCrmLoginAction } from "@/server/crm/actions";
import { validatePharmacyLoginAction } from "@/server/pharmacy/actions";
import { validateHrLoginAction } from "@/server/hr/actions";
import { ChevronLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";

export default function WorkspacePage() {
  const router = useRouter();
  const { authDraft, authReady, session, setAuthDraft, setSession } = useSession();
  const [role, setRole] = useState<CandelaRole>("frontdesk");
  const [email, setEmail] = useState("staff@navayu.in");
  const [password, setPassword] = useState("demo2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authReady) return;
    if (session) return;
    if (!authDraft?.tenantId) router.replace("/tenant");
    else if (!authDraft.branchId) router.replace("/branch");
  }, [authDraft, authReady, session, router]);

  useEffect(() => {
    let ignore = false;
    const prefillEmail = async () => {
      try {
        const res = await fetch("/api/session/compat", { cache: "no-store" });
        if (!res.ok) return;
        const { session: platformSession } = (await res.json()) as {
          session: { userEmail?: string } | null;
        };
        if (!ignore && platformSession?.userEmail) {
          setEmail(platformSession.userEmail);
        }
      } catch {
        /* optional prefill */
      }
    };
    void prefillEmail();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (role === "crm") {
      setEmail(CRM_MANAGER_EMAIL);
      setPassword("");
    } else if (role === "pharmacy") {
      setEmail(PHARMACY_MANAGER_EMAIL);
      setPassword("");
    } else if (role === "hr") {
      setEmail(HR_MANAGER_EMAIL);
      setPassword("");
    } else if (role === "counsellor") {
      setEmail(COUNSELLOR_MANAGER_EMAIL);
      setPassword("");
    } else {
      setEmail("staff@navayu.in");
      setPassword("demo2026");
    }
    setError("");
  }, [role]);

  const selected = WORKSPACES.find((w) => w.role === role)!;

  const signInToWorkspace = async (e: FormEvent) => {
    e.preventDefault();
    if (!authDraft?.branchId || !authDraft.branchName) return;
    setError("");

    const authResult = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (authResult?.error) {
      setError("Invalid email or password.");
      return;
    }

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
      tenant: authDraft.tenantId,
      tenantName: authDraft.tenantName,
      branchId: authDraft.branchId,
      branchName: authDraft.branchName,
      role,
      userName: email.trim(),
      userEmail: email.trim(),
      crmOperatorId,
      pharmacyOperatorId,
      hrOperatorId,
    });
    setAuthDraft(null);
    router.replace(selected.homePath);
  };

  return (
    <GlassAuthShell
      step={4}
      title="Sign in to workspace"
      subtitle={
        role === "crm"
          ? `${authDraft?.branchName ?? ""} · manager & team use separate CRM logins`
          : role === "pharmacy"
            ? `${authDraft?.branchName ?? ""} · manager, OPD & purchase use separate logins`
            : role === "hr"
              ? `${authDraft?.branchName ?? ""} · HR manager & executive logins`
              : role === "counsellor"
                ? `${authDraft?.branchName ?? ""} · counsellor team logins`
                : `${authDraft?.branchName ?? ""} · select role, then enter credentials`
      }
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
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-zinc-700">Workspace role</label>
          <Select value={role} onValueChange={(v) => setRole(v as CandelaRole)}>
            <SelectTrigger className="!w-full h-12 rounded-2xl border-0 bg-white/65 px-4 text-[15px] shadow-sm">
              <SelectValue>{selected.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WORKSPACES.map((ws) => (
                <SelectItem key={ws.role} value={ws.role}>
                  {ws.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[12px] text-zinc-500">{selected.description}</p>
        </div>

        {role === "pharmacy" && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-900">
            <p className="font-medium">Pharmacy demo logins</p>
            <p className="mt-1">Manager: {PHARMACY_MANAGER_EMAIL}</p>
            <p>OPD pharmacist: opd@navayu.in</p>
            <p>Purchase: purchase@navayu.in</p>
          </div>
        )}

        {role === "crm" && (
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-blue-900">
            <p className="font-medium">CRM demo logins</p>
            <p className="mt-1">Manager: {CRM_MANAGER_EMAIL}</p>
            <p>Counsellor: priya@navayu.in</p>
            <p>Caller: rahul@navayu.in</p>
          </div>
        )}

        {role === "hr" && (
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-violet-900">
            <p className="font-medium">HR demo logins</p>
            <p className="mt-1">Manager: {HR_MANAGER_EMAIL}</p>
            <p>Executive: kavita.hr@navayu.in</p>
          </div>
        )}

        {role === "counsellor" && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
            <p className="font-medium">Counsellor demo logins</p>
            <p className="mt-1">Priya: {COUNSELLOR_MANAGER_EMAIL}</p>
            <p>Anita: anita@navayu.in</p>
          </div>
        )}

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

        <Button type="submit" className={cn(glassButtonClass, "mt-2")}>
          Enter {selected.shortLabel} workspace
        </Button>
      </form>

      <p className="mt-4 text-center text-[11px] text-zinc-500">
        Credentials are validated server-side against PostgreSQL — no client-side password checks.
      </p>
    </GlassAuthShell>
  );
}
