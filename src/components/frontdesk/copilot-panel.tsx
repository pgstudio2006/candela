"use client";

import { MarkdownMessage } from "@/components/candela/markdown-message";
import { useSession } from "@/components/candela/session-provider";
import { getPatient } from "@/design-system/frontdesk-data";
import { cn } from "@/lib/utils";
import type { CopilotAction, CopilotContext, CopilotMessage } from "@/lib/ai/scribe-types";
import { CopilotMark } from "@/components/frontdesk/copilot-mark";
import { ArrowRight, Loader2, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH_KEY = "candela-copilot-width";
const MIN_W = 260;
const MAX_W = 520;
const DEFAULT_W = 340;

type CopilotPanelProps = {
  open: boolean;
  onClose: () => void;
  context: string;
  module?: string;
  page?: string;
  visitId?: string;
  patient?: CopilotContext["patient"];
  queueSummary?: string;
  consultSnapshot?: CopilotContext["consultSnapshot"];
  onAgentAction?: (action: CopilotAction) => void;
};

type ChatItem = CopilotMessage & { actions?: CopilotAction[] };

export function CopilotPanel({
  open,
  onClose,
  context,
  module: moduleProp,
  page: pageProp,
  visitId,
  patient,
  queueSummary,
  consultSnapshot,
  onAgentAction,
}: CopilotPanelProps) {
  const router = useRouter();
  const { activePatientId, session } = useSession();
  const activePatient = activePatientId ? getPatient(activePatientId) : null;
  const [width, setWidth] = useState(DEFAULT_W);
  const [tab, setTab] = useState<"chat" | "actions">("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      content: `I'm your ${context} agent. Ask me to draft consult notes, add medicines, or navigate to a task — I'll execute it when possible.`,
    },
  ]);
  const [pendingActions, setPendingActions] = useState<CopilotAction[]>([]);
  const dragging = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(WIDTH_KEY);
    if (stored) {
      const n = Number(stored);
      if (n >= MIN_W && n <= MAX_W) setWidth(n);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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

  const runActions = (actions: CopilotAction[]) => {
    for (const action of actions) {
      onAgentAction?.(action);
      if (action.type === "navigate") {
        router.push(action.href);
      }
    }
    setPendingActions((prev) => [...prev, ...actions]);
  };

  const resolvedModule = moduleProp ?? session?.role ?? "workspace";
  const resolvedPage = pageProp ?? context;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setLoading(true);

    const nextMessages: ChatItem[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter((m) => m.role === "user" || m.role === "assistant").map(({ role, content }) => ({ role, content })),
          context: {
            module: resolvedModule,
            role: session?.role ?? resolvedModule,
            page: resolvedPage,
            visitId,
            patient: patient ?? (activePatient ? { name: activePatient.name, uhid: activePatient.uhid, age: activePatient.age } : undefined),
            queueSummary,
            consultSnapshot,
          } satisfies CopilotContext,
        }),
      });
      const data = (await res.json()) as { reply?: string; actions?: CopilotAction[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Copilot request failed");

      const actions = data.actions ?? [];
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Done.", actions }]);
      if (actions.length) {
        runActions(actions);
        setTab("actions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot error");
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-[13px] font-medium">Copilot Agent</p>
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
          {(["chat", "actions"] as const).map((t) => (
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
              {t === "actions" && pendingActions.length > 0 && (
                <span className="ml-1 tabular-nums text-[10px]">({pendingActions.length})</span>
              )}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          {tab === "chat" ? (
            <div className="space-y-3 p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "ml-6 bg-[var(--attio-text)] text-white"
                      : "mr-4 border border-[var(--attio-border-subtle)] bg-[var(--attio-surface)] text-[var(--attio-text-secondary)]",
                  )}
                >
                  {m.role === "assistant" ? (
                    <MarkdownMessage content={m.content} className="text-[13px]" />
                  ) : (
                    <div>{m.content}</div>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <p className="mt-2 text-[10px] font-medium text-emerald-600">
                      Executed {m.actions.length} action{m.actions.length === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--attio-text-tertiary)]">
                  <Loader2 className="size-3.5 animate-spin" />
                  Working…
                </div>
              )}
              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </div>
          ) : (
            <ul className="space-y-2 p-4">
              {pendingActions.length === 0 ? (
                <p className="text-[12px] text-[var(--attio-text-tertiary)]">
                  Agent actions appear here when Copilot updates the workspace.
                </p>
              ) : (
                pendingActions.map((a, i) => (
                  <li key={i} className="rounded-lg border border-[var(--attio-border-subtle)] p-3 text-[12px]">
                    {a.type === "navigate" && (
                      <Link href={a.href} className="font-medium text-[var(--attio-accent)] hover:underline">
                        {a.label ?? "Open page"}
                      </Link>
                    )}
                    {a.type === "fill_section" && (
                      <p>
                        Filled <span className="font-medium">{a.section}</span> on consult
                      </p>
                    )}
                    {a.type === "set_prescription" && (
                      <p>
                        Updated prescription · {a.lines.length} medicine{a.lines.length === 1 ? "" : "s"}
                      </p>
                    )}
                    {a.type === "register_patient" && (
                      <p>
                        Registered patient · {String(a.data.firstName ?? a.data.fullName ?? a.data.phone ?? "new")}
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--attio-border-subtle)] p-3">
          <form
            className="flex items-center gap-2 rounded-lg border border-[var(--attio-border)] bg-[var(--attio-surface)] px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Tell Copilot what to do in ${context.toLowerCase()}…`}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--attio-text-tertiary)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex size-7 items-center justify-center rounded-md bg-[var(--attio-text)] text-white hover:bg-[#333] disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
