"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { glassInnerCardClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { BRANCHES } from "@/design-system/mock-data";
import { cn } from "@/lib/utils";
import { ChevronRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BranchPage() {
  const router = useRouter();
  const { authDraft, authReady, session, setAuthDraft } = useSession();

  useEffect(() => {
    if (!authReady) return;
    if (session) return;
    if (!authDraft?.tenantId) router.replace("/tenant");
  }, [authDraft, authReady, session, router]);

  const selectBranch = (branchId: string, branchName: string) => {
    if (!authDraft) return;
    setAuthDraft({ ...authDraft, branchId, branchName });
    router.push("/workspace");
  };

  return (
    <GlassAuthShell
      step={3}
      title="Choose your branch"
      subtitle={authDraft?.tenantName ?? "Navayu Spine & Joint Care"}
      cardClassName="max-w-[440px]"
    >
      <div className="space-y-3">
        {BRANCHES.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => selectBranch(branch.id, branch.name)}
            className={cn(
              glassInnerCardClass,
              "flex w-full cursor-pointer items-center gap-3 text-left",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#4285f4]">
              <MapPin className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-zinc-900">{branch.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                <span className="font-mono">{branch.code}</span>
                {" · "}Active · OPD & procedures
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-zinc-400" />
          </button>
        ))}
      </div>
    </GlassAuthShell>
  );
}
