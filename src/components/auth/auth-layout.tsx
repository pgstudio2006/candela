import { CandelaLogo } from "@/components/auth/candela-logo";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  className?: string;
};

const STEPS = [
  { n: 1, label: "Platform" },
  { n: 2, label: "Organization" },
  { n: 3, label: "Branch" },
  { n: 4, label: "Workspace" },
] as const;

export function AuthLayout({
  children,
  step,
  title,
  subtitle,
  className,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className={cn("w-full max-w-md", className)}>
          <div className="mb-8 flex flex-col items-center">
            <CandelaLogo size="lg" />
          </div>

          <nav
            aria-label="Sign-in progress"
            className="mb-8 flex items-center justify-center gap-1"
          >
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-medium transition-colors",
                    step === s.n
                      ? "bg-primary text-primary-foreground"
                      : step > s.n
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-6",
                      step > s.n ? "bg-primary/30" : "bg-border",
                    )}
                  />
                )}
              </div>
            ))}
          </nav>

          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {children}
        </div>
      </div>

      <footer className="pb-6 text-center text-[11px] text-muted-foreground">
        Healthcare Operating System · Navayu Spine & Joint Care
      </footer>
    </div>
  );
}
