import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  ListOrdered,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CounsellorNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const COUNSELLOR_NAV: CounsellorNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/app/counsellor", icon: LayoutDashboard },
  { id: "queue", label: "Counsel queue", href: "/app/counsellor/queue", icon: ListOrdered },
  { id: "patients", label: "Patients", href: "/app/counsellor/patients", icon: Users },
  { id: "packages", label: "Packages", href: "/app/counsellor/packages", icon: Package },
  { id: "approvals", label: "Approvals", href: "/app/counsellor/approvals", icon: ClipboardCheck },
  { id: "analytics", label: "Analytics", href: "/app/counsellor/analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", href: "/app/counsellor/settings", icon: Settings },
];

export function getCounsellorNavItem(pathname: string) {
  return (
    COUNSELLOR_NAV.find((n) =>
      n.href === "/app/counsellor" ? pathname === n.href : pathname.startsWith(n.href),
    ) ?? COUNSELLOR_NAV[0]
  );
}
