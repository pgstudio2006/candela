import {
  Calendar,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Network,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type HrNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: "workspace" | "people" | "ops" | "insights";
  managerOnly?: boolean;
};

export const HR_NAV: HrNavItem[] = [
  { id: "dashboard", label: "Command center", href: "/app/hr", icon: LayoutDashboard, group: "workspace" },
  { id: "staff", label: "Staff directory", href: "/app/hr/staff", icon: Users, group: "people" },
  { id: "org-chart", label: "Org chart", href: "/app/hr/org-chart", icon: Network, group: "people" },
  { id: "scheduling", label: "Scheduling", href: "/app/hr/scheduling", icon: CalendarClock, group: "ops" },
  { id: "leave", label: "Leave", href: "/app/hr/leave", icon: Calendar, group: "ops" },
  { id: "attendance", label: "Attendance", href: "/app/hr/attendance", icon: ClipboardList, group: "ops" },
  { id: "payroll", label: "Payroll", href: "/app/hr/payroll", icon: Wallet, group: "insights", managerOnly: true },
  { id: "settings", label: "Settings", href: "/app/hr/settings", icon: Settings, group: "insights" },
];

export const HR_NAV_GROUPS = [
  { id: "workspace", label: "Workspace" },
  { id: "people", label: "People" },
  { id: "ops", label: "Operations" },
  { id: "insights", label: "Insights" },
] as const;

export function getHrNavItem(pathname: string) {
  return HR_NAV.find((n) => (n.href === "/app/hr" ? pathname === n.href : pathname.startsWith(n.href))) ?? HR_NAV[0];
}

export function canAccessHrNav(item: HrNavItem, isManager: boolean) {
  if (item.managerOnly && !isManager) return false;
  return true;
}
