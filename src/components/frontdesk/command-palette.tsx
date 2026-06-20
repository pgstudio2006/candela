"use client";

import { SidebarIcon } from "@/components/frontdesk/sidebar-icon";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import {
  FRONTDESK_LISTS,
  FRONTDESK_NAV,
} from "@/design-system/frontdesk-nav";
import { patientDisplayName } from "@/lib/frontdesk-workflow";
import { cn } from "@/lib/utils";
import { Command, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PaletteItem = {
  id: string;
  label: string;
  href?: string;
  icon?: (typeof FRONTDESK_NAV)[number]["icon"];
  group: string;
  action?: "settings";
};

const NAV_ITEMS: PaletteItem[] = [
  ...FRONTDESK_NAV.map((n) => ({
    id: n.id,
    label: n.label,
    href: n.href,
    icon: n.icon,
    group: "Workspace",
  })),
  ...FRONTDESK_LISTS.map((n) => ({
    id: n.id,
    label: n.label,
    href: n.href,
    icon: n.icon,
    group: "Lists",
  })),
  {
    id: "settings",
    label: "Settings",
    group: "Actions",
    action: "settings",
    icon: Settings,
  },
];

type FrontdeskCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
};

export function FrontdeskCommandPalette({
  open,
  onClose,
  onOpenSettings,
}: FrontdeskCommandPaletteProps) {
  const router = useRouter();
  const { searchPatients } = useFrontdeskStore();
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const patientItems = useMemo((): PaletteItem[] => {
    const query = q.trim();
    if (query.length < 2) return [];
    return searchPatients(query)
      .slice(0, 8)
      .map((p) => ({
        id: `patient-${p.id}`,
        label: `${patientDisplayName(p)} · ${p.uhid} · ${p.phone}`,
        href: `/app/frontdesk/patients/${p.id}`,
        icon: User,
        group: "Patients",
      }));
  }, [q, searchPatients]);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (i) =>
          !q ||
          i.label.toLowerCase().includes(q.toLowerCase()) ||
          i.group.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  const items = useMemo(() => [...patientItems, ...navItems], [patientItems, navItems]);

  const grouped = useMemo(() => {
    const order = ["Patients", "Workspace", "Lists", "Actions"];
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return order
      .filter((g) => map.has(g))
      .map((g) => [g, map.get(g)!] as const);
  }, [items]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex((i) => (items.length ? Math.min(i, items.length - 1) : 0));
  }, [items.length]);

  const runItem = useCallback(
    (item: PaletteItem) => {
      onClose();
      if (item.action === "settings") {
        onOpenSettings?.();
        return;
      }
      if (item.href) router.push(item.href);
    },
    [onClose, onOpenSettings, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      }
      if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        runItem(items[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, items, activeIndex, runItem]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-[14vh] backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick actions"
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--attio-border)] bg-white shadow-[0_16px_70px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--attio-border-subtle)] px-3">
          <Command className="size-4 shrink-0 text-[var(--attio-text-tertiary)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients, screens, actions…"
            className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--attio-text-tertiary)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--attio-border)] px-1.5 font-mono text-[10px] text-[var(--attio-text-tertiary)]">
            esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
              {q.trim().length >= 2 ? `No results for "${q}"` : "Type to search patients or screens…"}
            </li>
          ) : (
            grouped.map(([group, groupItems]) => (
              <li key={group}>
                <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--attio-text-tertiary)] uppercase">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    const index = items.indexOf(item);
                    const active = index === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-index={index}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                            active
                              ? "bg-[var(--attio-active)] text-[var(--attio-text)]"
                              : "text-[var(--attio-text-secondary)] hover:bg-[var(--attio-surface)]",
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runItem(item)}
                        >
                          {item.icon && <SidebarIcon icon={item.icon} active={active} />}
                          <span className="flex-1 truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
