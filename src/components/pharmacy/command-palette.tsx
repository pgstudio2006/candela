"use client";

import { SidebarIcon } from "@/components/frontdesk/sidebar-icon";
import { PHARMACY_NAV } from "@/design-system/pharmacy-nav";
import { cn } from "@/lib/utils";
import { Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ACTIONS = [
  { id: "rx", label: "Open prescriptions queue", href: "/app/pharmacy/prescriptions" },
  { id: "po", label: "Create purchase order", href: "/app/pharmacy/purchase-orders" },
  { id: "inv", label: "View inventory", href: "/app/pharmacy/inventory" },
];

export function PharmacyCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = useMemo(() => PHARMACY_NAV.filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const actions = useMemo(() => ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const items = useMemo(
    () => [
      ...actions.map((a) => ({ type: "action" as const, id: a.id, label: a.label, href: a.href })),
      ...nav.map((n) => ({ type: "nav" as const, id: n.id, label: n.label, href: n.href, icon: n.icon })),
    ],
    [actions, nav],
  );

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIdx((i) => (items.length ? (i + 1) % items.length : 0));
      if (e.key === "ArrowUp") setIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      if (e.key === "Enter" && items[idx]) {
        onClose();
        router.push(items[idx].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, items, idx, router]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 pt-[14vh]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3">
          <Command className="size-4 text-[var(--attio-text-tertiary)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Navigate pharmacy…"
            className="h-11 flex-1 bg-transparent text-[14px] outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px]", i === idx && "bg-[var(--attio-active)]")}
                onClick={() => {
                  onClose();
                  router.push(item.href);
                }}
              >
                {"icon" in item && item.icon ? <SidebarIcon icon={item.icon} active={i === idx} /> : null}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
