"use client";

import { useSession } from "@/components/candela/session-provider";
import { getPatient } from "@/design-system/frontdesk-data";
import { cn } from "@/lib/utils";
import { CopilotMark } from "@/components/frontdesk/copilot-mark";
import { ArrowRight, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH_KEY = "candela-copilot-width";
const MIN_W = 260;
const MAX_W = 520;
const DEFAULT_W = 340;

const SUMMARY =
  "47 arrivals today. Billing-first OPD active. 3 patients waiting over 20 min on Dr. Mehta's queue.";

const INSIGHTS = [
  { title: "Situation", body: "Spine OPD 68% check-in. Wellness queue clear." },
  { title: "Priority", body: "Meena Devi — junior exam. Anita — billing pending." },
  { title: "Impact", body: "Queue delay may push 11:30 appointments by ~15 min." },
];

const ACTIONS = [
  { title: "Check in Anita Kumari", href: "/app/frontdesk/check-in", color: "#14B8A6" },
  { title: "Bill Vikram Singh", href: "/app/frontdesk/billing", color: "#22C55E" },
  { title: "Junior exam — Meena", href: "/app/frontdesk/junior-exam", color: "#8B5CF6" },
];

type CopilotPanelProps = {
  open: boolean;
  onClose: () => void;
  context: string;
};

export function CopilotPanel({ open, onClose, context }: CopilotPanelProps) {
  const { activePatientId } = useSession();
  const patient = activePatientId ? getPatient(activePatientId) : null;
  const [width, setWidth] = useState(DEFAULT_W);
  const [tab, setTab] = useState<"summary" | "actions">("summary");
  const dragging = useRef(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(WIDTH_KEY);
    if (stored) {
      const n = Number(stored);
      if (n >= MIN_W && n <= MAX_W) setWidth(n);
    }
  }, []);

  const persistWidth = useCallback((w: number) => {
    const clamped = Math.min(MAX_W, Math.max(MIN_W, w));
    setWidth(clamped);
    localStorage.setItem(WIDTH_KEY, String(clamped));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      persistWidth(rect.right - e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [persistWidth]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} aria-hidden />

      <aside
        ref={panelRef}
        style={{ width }}
        className={cn(
          "relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-[var(--attio-border)] bg-[var(--attio-canvas)]",
          "fixed inset-y-0 right-0 z-50 max-w-[100vw] shadow-xl lg:static lg:z-auto lg:shadow-none",
        )}
      >
        {/* Drag to resize — left edge */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="group absolute top-0 left-0 z-10 hidden h-full w-2 -translate-x-1/2 cursor-col-resize lg:block"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-[var(--attio-border)] group-active:bg-[var(--attio-text-tertiary)]" />
        </div>

        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--attio-border-subtle)] px-3">
          <CopilotMark size={16} active />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">Copilot</p>
            <p className="truncate text-[10px] text-[var(--attio-text-tertiary)]">{context}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--attio-text-tertiary)] hover:bg-[var(--attio-hover)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex border-b border-[var(--attio-border-subtle)] px-3">
          {(["summary", "actions"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-2.5 py-2 text-[12px] font-medium capitalize transition-colors",
                tab === t
                  ? "border-[var(--attio-text)] text-[var(--attio-text)]"
                  : "border-transparent text-[var(--attio-text-tertiary)] hover:text-[var(--attio-text-secondary)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {tab === "summary" && (
              <>
                <p className="text-[13px] leading-[1.6] text-[var(--attio-text-secondary)]">{SUMMARY}</p>

                {patient && (
                  <div className="rounded-lg border border-[var(--attio-border-subtle)] p-3">
                    <p className="text-[10px] font-medium tracking-wide text-[var(--attio-text-tertiary)] uppercase">
                      Active patient
                    </p>
                    <p className="mt-1 text-[14px] font-medium">{patient.name}</p>
                    <p className="font-mono text-[11px] text-[var(--attio-text-tertiary)]">{patient.uhid}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {INSIGHTS.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] px-3 py-2.5"
                    >
                      <p className="text-[12px] font-semibold text-[var(--attio-text)]">{item.title}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--attio-text-tertiary)]">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "actions" && (
              <ul className="space-y-2">
                {ACTIONS.map((a) => (
                  <li key={a.href}>
                    <Link
                      href={a.href}
                      onClick={onClose}
                      className="group flex items-center gap-3 rounded-lg border border-[var(--attio-border-subtle)] p-3 transition-colors hover:border-[var(--attio-border)] hover:bg-[var(--attio-surface)]"
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: a.color }}
                      >
                        <ArrowRight className="size-3.5" />
                      </span>
                      <span className="flex-1 text-[13px] font-medium text-[var(--attio-text)]">
                        {a.title}
                      </span>
                      <ArrowRight className="size-3.5 text-[var(--attio-text-tertiary)] opacity-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--attio-border-subtle)] p-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--attio-border)] bg-[var(--attio-surface)] px-3 py-2">
            <input
              placeholder={`Ask Copilot about ${context.toLowerCase()}…`}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--attio-text-tertiary)]"
            />
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md bg-[var(--attio-text)] text-white hover:bg-[#333]"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
