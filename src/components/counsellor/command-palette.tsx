"use client";

import { SidebarIcon } from "@/components/frontdesk/sidebar-icon";
import { COUNSELLOR_NAV } from "@/design-system/counsellor-nav";
import { cn } from "@/lib/utils";
import { Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PaletteItem = {
  id: string;
  label: string;
  href?: string;
  icon?: (typeof COUNSELLOR_NAV)[number]["icon"];
  group: string;
};

const ITEMS: PaletteItem[] = COUNSELLOR_NAV.map((n) => ({
  id: n.id,
  label: n.label,
  href: n.href,
  icon: n.icon,
  group: "Workspace",
}));

export function CounsellorCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => ITEMS.filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase())), [q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const run = useCallback((item: PaletteItem) => {
    onClose();
    if (item.href) router.push(item.href);
  }, [onClose, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0)); }
      if (e.key === "Enter" && items[activeIndex]) { e.preventDefault(); run(items[activeIndex]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, items, activeIndex, run]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-[14vh] backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--attio-border)] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3">
          <Command className="size-4 text-[var(--attio-text-tertiary)]" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search queue, patients, screens…" className="h-11 flex-1 bg-transparent text-[14px] outline-none" />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {items.map((item, index) => (
            <li key={item.id}>
              <button type="button" className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]", index === activeIndex ? "bg-[var(--attio-active)]" : "hover:bg-[var(--attio-surface)]")} onClick={() => run(item)}>
                {item.icon && <SidebarIcon icon={item.icon} active={index === activeIndex} />}
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
