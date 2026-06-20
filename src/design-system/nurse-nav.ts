import {
  Activity,
  FileCheck,
  LayoutDashboard,
  ListOrdered,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NurseNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NURSE_NAV: NurseNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/app/nurse", icon: LayoutDashboard },
  { id: "queue", label: "Execution queue", href: "/app/nurse/queue", icon: ListOrdered },
  { id: "patients", label: "Patients", href: "/app/nurse/patients", icon: Users },
  { id: "consent", label: "Consent registry", href: "/app/nurse/consent", icon: FileCheck },
  { id: "analytics", label: "Analytics", href: "/app/nurse/analytics", icon: Activity },
  { id: "audit", label: "Audit log", href: "/app/nurse/audit", icon: ScrollText },
  { id: "settings", label: "Settings", href: "/app/nurse/settings", icon: Settings },
];

export function getNurseNavItem(pathname: string) {
  return (
    NURSE_NAV.find((n) =>
      n.href === "/app/nurse" ? pathname === n.href : pathname.startsWith(n.href),
    ) ?? NURSE_NAV[0]
  );
}
