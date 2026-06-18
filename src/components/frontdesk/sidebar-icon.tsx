import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal sidebar icon — thin stroke, no colored boxes */
export function SidebarIcon({
  icon: Icon,
  active = false,
  className,
}: {
  icon: LucideIcon;
  active?: boolean;
  className?: string;
}) {
  return (
    <Icon
      className={cn(
        "size-[15px] shrink-0 stroke-[1.75]",
        active ? "text-[var(--attio-text)]" : "text-[var(--attio-text-tertiary)]",
        className,
      )}
    />
  );
}
