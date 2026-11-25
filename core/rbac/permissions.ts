export const PERMISSIONS = {
  // Dashboard
  "dashboard.view": "dashboard.view",

  // Students
  "students.view": "students.view",
  "students.create": "students.create",
  "students.update": "students.update",
  "students.delete": "students.delete",
  "students.resetPassword": "students.resetPassword",
  "students.export": "students.export",

  // Teachers
  "teachers.view": "teachers.view",
  "teachers.create": "teachers.create",
  "teachers.update": "teachers.update",
  "teachers.delete": "teachers.delete",
  "teachers.resetPassword": "teachers.resetPassword",

  // Staff
  "staff.view": "staff.view",
  "staff.create": "staff.create",
  "staff.update": "staff.update",
  "staff.delete": "staff.delete",
  "staff.assign": "staff.assign",
  "staff.resetPassword": "staff.resetPassword",

  // Admins (Super Admin only)
  "admins.view": "admins.view",
  "admins.create": "admins.create",
  "admins.update": "admins.update",
  "admins.delete": "admins.delete",
  "admins.resetPassword": "admins.resetPassword",

  // Classes
  "classes.view": "classes.view",
  "classes.create": "classes.create",
  "classes.update": "classes.update",
  "classes.delete": "classes.delete",
  "classes.assignStaff": "classes.assignStaff",
  "classes.enrollStudents": "classes.enrollStudents",

  // Subjects
  "subjects.view": "subjects.view",
  "subjects.create": "subjects.create",
  "subjects.update": "subjects.update",
  "subjects.delete": "subjects.delete",

  // Exams & Tests
  "exams.view": "exams.view",
  "exams.create": "exams.create",
  "exams.update": "exams.update",
  "exams.delete": "exams.delete",
  "exams.assignEvaluators": "exams.assignEvaluators",

  // Marks
  "marks.view": "marks.view",
  "marks.viewOwn": "marks.viewOwn",
  "marks.evaluate": "marks.evaluate",
  "marks.update": "marks.update",
  "marks.export": "marks.export",

  // Analysis
  "analysis.viewOwn": "analysis.viewOwn",
  "analysis.viewStudents": "analysis.viewStudents",

  // Attendance
  "attendance.view": "attendance.view",
  "attendance.mark": "attendance.mark",
  "attendance.create": "attendance.create",
  "attendance.update": "attendance.update",
  "attendance.delete": "attendance.delete",
  "attendance.finalize": "attendance.finalize",
  "attendance.export": "attendance.export",

  // Announcements
  "announcements.view": "announcements.view",
  "announcements.create": "announcements.create",
  "announcements.update": "announcements.update",
  "announcements.delete": "announcements.delete",

  // Centers
  "centers.view": "centers.view",
  "centers.create": "centers.create",
  "centers.update": "centers.update",
  "centers.delete": "centers.delete",

  // Leaderboard
  "leaderboard.view": "leaderboard.view",
  "leaderboard.sync": "leaderboard.sync",

  // Settings
  "settings.system": "settings.system",
  "account.update": "account.update",
  "account.changePassword": "account.changePassword",

  // Super Admin Exclusive Tools
  "permissions.view": "permissions.view",
  "permissions.manage": "permissions.manage",
  "audit.view": "audit.view",
  "security.view": "security.view",
  "security.manage": "security.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type UserRole = "super_admin" | "admin" | "teacher" | "staff" | "student";

// Super Admin exclusive permissions that can NEVER be granted to other roles
export const SUPER_ADMIN_EXCLUSIVE: Permission[] = [
  "permissions.view",
  "permissions.manage",
  "audit.view",
  "security.view",
  "security.manage",
  "admins.view",
  "admins.create",
  "admins.update",
  "admins.delete",
  "admins.resetPassword",
  "leaderboard.sync",
];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const MODULE_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  dashboard: {
    label: "Dashboard",
    permissions: ["dashboard.view"],
  },
  students: {
    label: "Students",
    permissions: [
      "students.view",
      "students.create",
      "students.update",
      "students.delete",
      "students.resetPassword",
      "students.export",
    ],
  },
  teachers: {
    label: "Teachers",
    permissions: [
      "teachers.view",
      "teachers.create",
      "teachers.update",
      "teachers.delete",
      "teachers.resetPassword",
    ],
  },
  staff: {
    label: "Staff Members",
    permissions: [
      "staff.view",
      "staff.create",
      "staff.update",
      "staff.delete",
      "staff.assign",
      "staff.resetPassword",
    ],
  },
  classes: {
    label: "Classes",
    permissions: [
      "classes.view",
      "classes.create",
      "classes.update",
      "classes.delete",
      "classes.assignStaff",
      "classes.enrollStudents",
    ],
  },
  subjects: {
    label: "Subjects",
    permissions: [
      "subjects.view",
      "subjects.create",
      "subjects.update",
      "subjects.delete",
    ],
  },
  exams: {
    label: "Exams & Tests",
    permissions: [
      "exams.view",
      "exams.create",
      "exams.update",
      "exams.delete",
      "exams.assignEvaluators",
    ],
  },
  marks: {
    label: "Marks",
    permissions: [
      "marks.view",
      "marks.viewOwn",
      "marks.evaluate",
      "marks.update",
      "marks.export",
    ],
  },
  analysis: {
    label: "Analysis & Performance",
    permissions: ["analysis.viewOwn", "analysis.viewStudents"],
  },
  attendance: {
    label: "Attendance",
    permissions: [
      "attendance.view",
      "attendance.mark",
      "attendance.create",
      "attendance.update",
      "attendance.delete",
      "attendance.finalize",
      "attendance.export",
    ],
  },
  announcements: {
    label: "Announcements",
    permissions: [
      "announcements.view",
      "announcements.create",
      "announcements.update",
      "announcements.delete",
    ],
  },
  centers: {
    label: "Centers",
    permissions: [
      "centers.view",
      "centers.create",
      "centers.update",
      "centers.delete",
    ],
  },
  leaderboard: {
    label: "Leaderboard",
    permissions: ["leaderboard.view", "leaderboard.sync"],
  },
  settings: {
    label: "Settings",
    permissions: ["settings.system", "account.update", "account.changePassword"],
  },
  super_admin: {
    label: "Super Admin Tools",
    permissions: [
      "admins.view",
      "admins.create",
      "admins.update",
      "admins.delete",
      "admins.resetPassword",
      "permissions.view",
      "permissions.manage",
      "audit.view",
      "security.view",
      "security.manage",
    ],
  },
};
