"use client";

import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { glassInnerCardClass } from "@/components/auth/glass-form";
import { useSession } from "@/components/candela/session-provider";
import { listTenantBranchesAction } from "@/server/platform-auth";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { ChevronRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BranchRow = { id: string; name: string; code: string; city?: string | null };

export default function BranchPage() {
  const router = useRouter();
  const { authDraft, authReady, session, setAuthDraft } = useSession();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    const next = resolvePostAuthPath(session, authDraft);
    if (next && next !== WORKSPACE_SIGN_IN_PATH) {
      router.replace(next);
      return;
    }
    if (session) return;
    if (!authDraft?.tenantId) router.replace("/tenant");
    else if (authDraft.branchId) router.replace(WORKSPACE_SIGN_IN_PATH);
  }, [authDraft, authReady, session, router]);

  useEffect(() => {
    if (!authDraft?.tenantId) return;
    let ignore = false;
    void listTenantBranchesAction(authDraft.tenantId).then((rows) => {
      if (!ignore) {
        setBranches(rows);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [authDraft?.tenantId]);

  const selectBranch = (branchId: string, branchName: string) => {
    if (!authDraft) return;
    setAuthDraft({ ...authDraft, branchId, branchName });
    router.push("/workspace");
  };

  return (
    <GlassAuthShell
      step={3}
      title="Choose your branch"
      subtitle={authDraft?.tenantName ?? "Organization"}
      cardClassName="max-w-[440px]"
    >
      <button
        type="button"
        onClick={() => {
          setAuthDraft(null);
          router.push("/tenant");
        }}
        className="mb-3 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
      >
        Use a different organization
      </button>
      <div className="space-y-3">
        {loading && <p className="text-center text-sm text-zinc-500">Loading branches…</p>}
        {!loading && branches.length === 0 && (
          <p className="text-center text-sm text-zinc-500">No active branches for this organization.</p>
        )}
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => selectBranch(branch.id, branch.name)}
            className={cn(glassInnerCardClass, "flex w-full cursor-pointer items-center gap-3 text-left")}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#4285f4]">
              <MapPin className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-zinc-900">{branch.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                <span className="font-mono">{branch.code}</span>
                {branch.city ? ` · ${branch.city}` : ""}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-zinc-400" />
          </button>
        ))}
      </div>
    </GlassAuthShell>
  );
}
