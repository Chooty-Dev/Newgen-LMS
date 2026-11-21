import { Permission } from "@/core/rbac/permissions";
import {
  LayoutDashboard,
  GraduationCap,
  LineChart,
  School,
  FileCheck2,
  BookOpen,
  Megaphone,
  Users,
  UserCheck,
  ClipboardList,
  Building2,
  Sliders,
  ShieldCheck,
  History,
  Lock,
  Settings,
  ShieldAlert,
  CalendarCheck,
  Trophy,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    title: "Marks",
    href: "/marks",
    icon: GraduationCap,
    permission: "marks.view",
  },
  {
    title: "Evaluate Marks",
    href: "/evaluate-marks",
    icon: FileCheck2,
    permission: "marks.evaluate",
  },
  {
    title: "Analysis",
    href: "/analysis",
    icon: LineChart,
    permission: "analysis.viewStudents",
  },
  {
    title: "Classes",
    href: "/classes",
    icon: School,
    permission: "classes.view",
  },
  {
    title: "Exams & Tests",
    href: "/exams",
    icon: ClipboardList,
    permission: "exams.view",
  },
  {
    title: "Subjects",
    href: "/subjects",
    icon: BookOpen,
    permission: "subjects.view",
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    permission: "attendance.view",
  },
  {
    title: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    permission: "announcements.view",
  },
  {
    title: "Students",
    href: "/students",
    icon: Users,
    permission: "students.view",
  },
  {
    title: "Teachers",
    href: "/teachers",
    icon: UserCheck,
    permission: "teachers.view",
  },
  {
    title: "Staff Members",
    href: "/staff",
    icon: Users,
    permission: "staff.view",
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    permission: "leaderboard.view",
  },
  {
    title: "Centers",
    href: "/centers",
    icon: Building2,
    permission: "centers.view",
  },
  {
    title: "System Settings",
    href: "/system-settings",
    icon: Sliders,
    permission: "settings.system",
  },
  // Super Admin Exclusive Pages
  {
    title: "Admins",
    href: "/admins",
    icon: ShieldAlert,
    permission: "admins.view",
  },
  {
    title: "Permissions",
    href: "/permissions",
    icon: ShieldCheck,
    permission: "permissions.view",
  },
  {
    title: "Audit Trail",
    href: "/audit-trail",
    icon: History,
    permission: "audit.view",
  },
  {
    title: "Security",
    href: "/security",
    icon: Lock,
    permission: "security.view",
  },
  // Settings (All roles)
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "account.update",
  },
];
