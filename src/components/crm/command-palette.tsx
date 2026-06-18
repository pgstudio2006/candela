"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { SidebarIcon } from "@/components/frontdesk/sidebar-icon";
import { CRM_NAV } from "@/design-system/crm-nav";
import { cn } from "@/lib/utils";
import { Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ACTIONS = [
  { id: "sim-wa", label: "Simulate WhatsApp lead", action: "sim_whatsapp" as const },
  { id: "sim-form", label: "Simulate Google Form lead", action: "sim_google" as const },
  { id: "add-lead", label: "Add lead manually", href: "/app/crm/leads?new=1" },
];

export function CrmCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { ingestFromIntegration } = useCrmStore();
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  activeIndexRef.current = activeIndex;

  const navItems = useMemo(
    () => CRM_NAV.filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const actionItems = useMemo(
    () => ACTIONS.filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const items = useMemo(
    () => [
      ...actionItems.map((a) => ({ type: "action" as const, ...a })),
      ...navItems.map((n) => ({ type: "nav" as const, id: n.id, label: n.label, href: n.href, icon: n.icon })),
    ],
    [actionItems, navItems],
  );

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const run = useCallback(
    (item: (typeof items)[number]) => {
      onClose();
      if (item.type === "nav") {
        router.push(item.href);
        return;
      }
      if (item.action === "sim_whatsapp") {
        ingestFromIntegration("whatsapp_business", {
          name: "WhatsApp Lead " + Date.now().toString().slice(-4),
          phone: "+91 98765 " + Math.floor(10000 + Math.random() * 89999),
          specialty: "knee",
          notes: "Simulated inbound message",
        });
        router.push("/app/crm/inbox");
      } else if (item.action === "sim_google") {
        ingestFromIntegration("google_forms", {
          name: "Form Lead " + Date.now().toString().slice(-4),
          phone: "+91 98765 " + Math.floor(10000 + Math.random() * 89999),
          specialty: "spine",
          notes: "Simulated Google Form submission",
        });
        router.push("/app/crm/inbox");
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router, ingestFromIntegration],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      }
      if (e.key === "Enter") {
        const item = items[activeIndexRef.current];
        if (item) {
          e.preventDefault();
          run(item);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, items, run]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-[14vh] backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--attio-border)] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3">
          <Command className="size-4 text-[var(--attio-text-tertiary)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, integrations, navigate…"
            className="h-11 flex-1 bg-transparent text-[14px] outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]",
                  index === activeIndex ? "bg-[var(--attio-active)]" : "hover:bg-[var(--attio-surface)]",
                )}
                onClick={() => run(item)}
              >
                {"icon" in item && item.icon ? <SidebarIcon icon={item.icon} active={index === activeIndex} /> : null}
                {item.label}
                {item.type === "action" && <span className="ml-auto text-[10px] text-[var(--attio-text-tertiary)]">Action</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
