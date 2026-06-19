"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MOBILE_LINKS = [
  { href: "/app/frontdesk", label: "Desk" },
  { href: "/app/frontdesk/queue", label: "Queue" },
  { href: "/app/frontdesk/check-in", label: "Check-in" },
  { href: "/app/frontdesk/patients", label: "Patients" },
];

/** Bottom nav for frontdesk on small screens */
export function MobileNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/app/frontdesk")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
      {MOBILE_LINKS.map((link) => {
        const active = pathname === link.href || (link.href !== "/app/frontdesk" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center text-[11px] font-medium",
              active ? "text-zinc-900" : "text-zinc-500",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
