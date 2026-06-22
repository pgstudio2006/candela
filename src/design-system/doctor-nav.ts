import {
  BarChart3,
  BedDouble,
  Calendar,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  ListOrdered,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type DoctorNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const DOCTOR_NAV: DoctorNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/app/doctor", icon: LayoutDashboard },
  { id: "queue", label: "OPD queue", href: "/app/doctor/queue", icon: ListOrdered },
  { id: "patients", label: "Patients", href: "/app/doctor/patients", icon: Users },
  { id: "ipd", label: "IPD rounds", href: "/app/doctor/ipd", icon: BedDouble },
  { id: "schedule", label: "Schedule", href: "/app/doctor/schedule", icon: Calendar },
  { id: "templates", label: "My templates", href: "/app/doctor/templates", icon: ScrollText },
  { id: "documents", label: "Print templates", href: "/app/doctor/documents", icon: FileStack },
  { id: "analytics", label: "Analytics", href: "/app/doctor/analytics", icon: BarChart3 },
  { id: "audit", label: "Audit log", href: "/app/doctor/audit", icon: ClipboardList },
  { id: "settings", label: "My profile", href: "/app/doctor/settings", icon: Settings },
];

export function getDoctorNavItem(pathname: string) {
  return (
    DOCTOR_NAV.find((n) =>
      n.href === "/app/doctor" ? pathname === n.href : pathname.startsWith(n.href),
    ) ?? DOCTOR_NAV[0]
  );
}
