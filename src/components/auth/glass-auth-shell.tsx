import { CandelaLogoMark } from "@/components/auth/candela-logo-mark";
import { GlassAuthBackground } from "@/components/auth/glass-auth-background";
import { glassCardClass } from "@/components/auth/glass-form";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GlassAuthShellProps = {
  children: ReactNode;
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  className?: string;
  cardClassName?: string;
  footer?: ReactNode;
};

const STEPS = [
  { n: 1, label: "Platform" },
  { n: 2, label: "Organization" },
  { n: 3, label: "Branch" },
  { n: 4, label: "Workspace" },
] as const;

export function GlassAuthShell({
  children,
  step,
  title,
  subtitle,
  className,
  cardClassName,
  footer,
}: GlassAuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <GlassAuthBackground />

      <main
        className={cn(
          "relative z-10 flex min-h-screen items-center justify-center px-4 py-16",
          className,
        )}
      >
        <div className={cn(glassCardClass, "max-w-[400px] font-sans", cardClassName)}>
          <div className="mb-6 flex justify-center">
            <CandelaLogoMark size={60} />
          </div>

          <nav
            aria-label="Sign-in progress"
            className="mb-6 flex items-center justify-center gap-1"
          >
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-medium transition-colors",
                    step === s.n
                      ? "bg-zinc-900 text-white"
                      : step > s.n
                        ? "bg-zinc-900/15 text-zinc-700"
                        : "bg-white/50 text-zinc-400",
                  )}
                >
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-5",
                      step > s.n ? "bg-zinc-900/25" : "bg-white/60",
                    )}
                  />
                )}
              </div>
            ))}
          </nav>

          <div className="mb-8 text-center">
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-zinc-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2.5 text-[15px] font-normal leading-relaxed text-zinc-500">
                {subtitle}
              </p>
            )}
          </div>

          {children}

          {footer}
        </div>
      </main>
    </div>
  );
}
