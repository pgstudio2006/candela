"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { Button } from "@/components/ui/button";
import { validateTenantAction } from "@/server/platform-auth";
import { cn } from "@/lib/utils";
import { Building2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function TenantPage() {
  const router = useRouter();
  const { setAuthDraft } = useSession();
  const [orgId, setOrgId] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const continueToBranch = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await validateTenantAction(orgId, orgPassword);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAuthDraft({
        tenantId: result.slug,
        tenantName: result.tenantName,
      });
      router.push("/branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassAuthShell
      step={2}
      title="Select organization"
      subtitle="Enter your organization credentials"
    >
      <form className="space-y-4" onSubmit={continueToBranch}>
        <GlassIconField
          icon={Building2}
          placeholder="Organization ID"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          autoComplete="organization"
        />

        <GlassIconField
          icon={KeyRound}
          type="password"
          placeholder="Organization password"
          value={orgPassword}
          onChange={(e) => setOrgPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className={cn(glassButtonClass, "mt-2")}>
          {loading ? "Verifying…" : "Verify organization"}
        </Button>
      </form>
    </GlassAuthShell>
  );
}
