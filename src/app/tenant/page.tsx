"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { GlassIconField, glassButtonClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

export default function TenantPage() {
  const router = useRouter();
  const { setAuthDraft } = useSession();

  const continueToBranch = (e: FormEvent) => {
    e.preventDefault();
    setAuthDraft({
      tenantId: "navayu",
      tenantName: "Navayu Spine & Joint Care",
    });
    router.push("/branch");
  };

  return (
    <GlassAuthShell
      step={2}
      title="Select organization"
      subtitle="Navayu Spine & Joint Care · Gurgaon & Pataudi"
    >
      <form className="space-y-4" onSubmit={continueToBranch}>
        <GlassIconField
          icon={Building2}
          placeholder="Organization ID"
          defaultValue="navayu"
          autoComplete="organization"
        />

        <GlassIconField
          icon={KeyRound}
          type="password"
          placeholder="Organization password"
          defaultValue="demo"
          autoComplete="current-password"
        />

        <Button type="submit" className={cn(glassButtonClass, "mt-2")}>
          Verify organization
        </Button>
      </form>
    </GlassAuthShell>
  );
}
