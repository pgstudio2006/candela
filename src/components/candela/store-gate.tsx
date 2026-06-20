"use client";

import { FormSkeleton, PageSkeleton } from "@/components/ui/skeleton";
import { AttioButton } from "@/components/frontdesk/ui";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type StoreGateProps = {
  ready: boolean;
  error?: string | null;
  onRetry?: () => void;
  variant?: "page" | "form";
  children: ReactNode;
};

export function StoreGate({ ready, error, onRetry, variant = "page", children }: StoreGateProps) {
  if (!ready) {
    return variant === "form" ? <FormSkeletonGate /> : <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="size-10 text-amber-600" />
        <div>
          <p className="text-[15px] font-medium text-[var(--attio-text)]">Could not load workspace data</p>
          <p className="mt-1 max-w-md text-[13px] text-[var(--attio-text-tertiary)]">{error}</p>
        </div>
        {onRetry && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <AttioButton variant="primary" onClick={onRetry}>
              Retry
            </AttioButton>
            {error?.toLowerCase().includes("session") && (
              <AttioButton variant="secondary" onClick={() => { window.location.href = "/workspace"; }}>
                Re-sign in to workspace
              </AttioButton>
            )}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

function FormSkeletonGate() {
  return (
    <div className="p-6">
      <FormSkeleton />
    </div>
  );
}
