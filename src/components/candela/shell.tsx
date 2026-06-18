"use client";

import { useSession } from "@/components/candela/session-provider";
import { CANDELA_MODULES, modulesForRole } from "@/design-system/modules";
import { cn } from "@/lib/utils";
import { Command, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const { commandOpen, setCommandOpen, session } = useSession();
  const [q, setQ] = useState("");
  const router = useRouter();
  const modules = session ? modulesForRole(session.role) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  if (!commandOpen) return null;

  const items = modules.flatMap((m) =>
    m.views.map((v) => ({
      label: `${m.label} · ${v.label}`,
      path: `${m.path}?view=${v.id}`,
    })),
  ).filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-[var(--c-z-palette)] flex items-start justify-center bg-[var(--c-overlay)] pt-[12vh] backdrop-blur-sm"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--c-radius-xl)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-3">
          <Search className="h-4 w-4 text-[var(--c-text-tertiary)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to module or view…"
            className="h-11 flex-1 bg-transparent text-[14px] text-[var(--c-text)] outline-none placeholder:text-[var(--c-text-placeholder)]"
          />
          <kbd className="rounded border border-[var(--c-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--c-text-tertiary)]">
            esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {items.map((item) => (
            <li key={item.path}>
              <button
                type="button"
                className="flex w-full rounded-[var(--c-radius-md)] px-3 py-2 text-left text-[13px] text-[var(--c-text-secondary)] hover:bg-[var(--c-surface-hover)] hover:text-[var(--c-text)]"
                onClick={() => {
                  setCommandOpen(false);
                  router.push(item.path);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TopBar() {
  const { session, setCommandOpen, setPatientDrawerOpen } = useSession();
  const pathname = usePathname();
  const navModules = session ? modulesForRole(session.role) : CANDELA_MODULES;

  return (
    <header
      className="flex h-[var(--c-shell-top)] shrink-0 items-center gap-1 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-3"
    >
      <Link href="/app/admin" className="mr-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--c-radius-md)] bg-[var(--c-accent)] text-[11px] font-bold text-white">
          C
        </div>
        <span className="hidden text-[13px] font-semibold tracking-tight text-[var(--c-text)] sm:inline">
          Candela
        </span>
      </Link>

      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
        {navModules.map((m) => (
          <Link
            key={m.id}
            href={m.path}
            className={cn(
              "whitespace-nowrap rounded-[var(--c-radius-md)] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              pathname.startsWith(m.path)
                ? "bg-[var(--c-surface-hover)] text-[var(--c-text)]"
                : "text-[var(--c-text-tertiary)] hover:bg-[var(--c-surface-hover)] hover:text-[var(--c-text)]",
            )}
          >
            {m.shortLabel}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-7 items-center gap-1.5 rounded-[var(--c-radius-md)] border border-[var(--c-border)] px-2 text-[11px] text-[var(--c-text-tertiary)] hover:bg-[var(--c-surface-hover)]"
      >
        <Command className="h-3 w-3" />
        <kbd className="font-mono text-[10px]">⌘K</kbd>
      </button>

      <button
        type="button"
        onClick={() => setPatientDrawerOpen(true)}
        className="ml-1 hidden h-7 rounded-[var(--c-radius-md)] border border-[var(--c-border)] px-2 text-[11px] text-[var(--c-text-tertiary)] hover:bg-[var(--c-surface-hover)] sm:inline"
      >
        Patient <kbd className="ml-1 font-mono text-[10px]">P</kbd>
      </button>

      {session && (
        <div className="ml-2 flex items-center gap-2 border-l border-[var(--c-border)] pl-2">
          <span className="hidden text-[11px] text-[var(--c-text-tertiary)] md:inline">
            {session.branchName}
          </span>
          <span className="rounded-full bg-[var(--c-surface-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-text-secondary)]">
            {session.role}
          </span>
        </div>
      )}
    </header>
  );
}

export function PatientDrawer() {
  const { patientDrawerOpen, setPatientDrawerOpen } = useSession();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        setPatientDrawerOpen(!patientDrawerOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [patientDrawerOpen, setPatientDrawerOpen]);

  if (!patientDrawerOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[calc(var(--c-z-drawer)-1)] bg-[var(--c-overlay)]"
        onClick={() => setPatientDrawerOpen(false)}
      />
      <aside
        className="fixed right-0 top-0 z-[var(--c-z-drawer)] flex h-full flex-col border-l border-[var(--c-border)] bg-[var(--c-surface)]"
        style={{ width: "var(--c-drawer-width)" }}
      >
        <div className="flex h-[var(--c-shell-top)] items-center justify-between border-b border-[var(--c-border)] px-4">
          <span className="text-[13px] font-semibold text-[var(--c-text)]">Patient context</span>
          <button type="button" onClick={() => setPatientDrawerOpen(false)} className="text-[var(--c-text-tertiary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-[13px] text-[var(--c-text-secondary)]">
          <p className="font-mono text-[11px] text-[var(--c-text-tertiary)]">NV-2026-0042</p>
          <p className="mt-1 text-lg font-semibold text-[var(--c-text)]">Suresh Patel</p>
        </div>
      </aside>
    </>
  );
}
