export interface StudentEnrollmentItem {
  id: string;
  classId: string;
  className: string;
  slug?: string;
  grade?: string;
  subject?: string;
  teacher?: string;
  schedule?: {
    type?: "regular" | "special";
    regular?: {
      daysOfWeek?: number[];
      startTime?: string;
      endTime?: string;
    };
    special?: {
      sessions?: Array<{ date: string; startTime: string; endTime: string }>;
    };
  } | null;
  type?: string;
  status: string;
  enrolledAt: string;
}

export interface StudentMarkItem {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentSlug?: string;
  type?: string;
  subject?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  attendanceStatus?: "present" | "absent" | "excused";
  status?: "draft" | "submitted";
  feedback?: string;
  evaluatedAt: string;
}

export interface StudentDetailRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  status: "active" | "disabled";
  joinedAt: string;
  admissionNo: string;
  grade: string;
  dateOfBirth?: string;
  guardian?: {
    name: string;
    phone: string;
    relation: string;
  };
  performanceScore: number;
  hasGradedScore?: boolean;
  marksScore?: number | null;
  attendanceScore?: number | null;
  group: "weak" | "medium" | "excellent";
  groupLabel?: string;
  attendanceBreakdown?: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    totalFinalized: number;
  };
  subjectBreakdown?: Array<{
    subject: string;
    average: number;
    count: number;
  }>;
  enrollments: StudentEnrollmentItem[];
  marks: StudentMarkItem[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatClassScheduleSummary(schedule: StudentEnrollmentItem["schedule"]): string {
  if (!schedule) return "Flexible schedule";
  if (schedule.type === "regular" && schedule.regular) {
    const days = (schedule.regular.daysOfWeek || [])
      .map((d) => DAY_NAMES[d])
      .filter(Boolean)
      .join(", ");
    const time =
      schedule.regular.startTime && schedule.regular.endTime
        ? `${schedule.regular.startTime} – ${schedule.regular.endTime}`
        : "";
    return [days || "Weekly", time].filter(Boolean).join(" • ");
  }
  if (schedule.type === "special" && schedule.special?.sessions?.length) {
    const first = schedule.special.sessions[0];
    return `${schedule.special.sessions.length} special session(s) • ${first.date}`;
  }
  return "Scheduled batch";
}

export function formatAssessmentTypeLabel(type?: string): string {
  switch (type) {
    case "exam":
      return "Exam";
    case "test":
      return "Test";
    case "mcq_quiz":
      return "Quiz";
    case "paper":
      return "Paper";
    case "assignment":
      return "Assignment";
    default:
      return "Assessment";
  }
}

export function formatStandingBadge(group: string): { label: string; className: string } {
  if (group === "excellent") {
    return {
      label: "Excellent",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (group === "weak") {
    return {
      label: "Needs Help",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    label: "Good",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  };
}
