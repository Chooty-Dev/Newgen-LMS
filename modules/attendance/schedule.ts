export type ScheduledSessionKind = "class" | "assessment";

export type ScheduledCategory =
  | "class"
  | "exam"
  | "test"
  | "mcq_quiz"
  | "paper"
  | "assignment";

export type ScheduledSessionState = "pending" | "draft" | "finalized";

export interface ScheduledAttendanceItem {
  id: string;
  kind: ScheduledSessionKind;
  category: ScheduledCategory;
  title: string;
  subject: string;
  scheduleType?: "regular" | "special";
  teacherName?: string;
  classNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  expectedCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  markedCount: number;
  sessionStatus: ScheduledSessionState;
  isFinalized: boolean;
  finalizedAt: string | null;
}

export interface ClassScheduleShape {
  type?: "regular" | "special";
  regular?: {
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  } | null;
  special?: {
    sessions?: Array<{
      date?: string;
      startTime?: string;
      endTime?: string;
    }>;
  } | null;
}

export interface AssessmentSessionSlot {
  date?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Resolves the day-of-week index (0=Sun..6=Sat) for a YYYY-MM-DD date string
 * at UTC noon so host timezone offsets never shift the calendar day.
 */
export function parseUtcDayOfWeek(dateStr: string): number {
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed.getUTCDay();
}

/**
 * Checks whether a YYYY-MM-DD string lies inside an optional inclusive [start, end] range.
 */
export function isDateWithinOptionalRange(
  dateStr: string,
  startDate?: Date | string | null,
  endDate?: Date | string | null
): boolean {
  if (startDate) {
    const startStr = new Date(startDate).toISOString().slice(0, 10);
    if (dateStr < startStr) return false;
  }
  if (endDate) {
    const endStr = new Date(endDate).toISOString().slice(0, 10);
    if (dateStr > endStr) return false;
  }
  return true;
}

/**
 * Determines whether a class schedule (regular weekly or special dates) occurs on dateStr.
 */
export function matchClassScheduleForDate(
  schedule: ClassScheduleShape | undefined | null,
  dateStr: string
): { scheduled: boolean; startTime: string; endTime: string } {
  if (!schedule) {
    return { scheduled: false, startTime: "", endTime: "" };
  }

  if (schedule.type === "regular" && schedule.regular) {
    const dayOfWeek = parseUtcDayOfWeek(dateStr);
    const days = schedule.regular.daysOfWeek || [];
    if (!days.includes(dayOfWeek)) {
      return { scheduled: false, startTime: "", endTime: "" };
    }
    if (
      !isDateWithinOptionalRange(
        dateStr,
        schedule.regular.startDate,
        schedule.regular.endDate
      )
    ) {
      return { scheduled: false, startTime: "", endTime: "" };
    }
    return {
      scheduled: true,
      startTime: schedule.regular.startTime || "08:00",
      endTime: schedule.regular.endTime || "18:00",
    };
  }

  if (schedule.type === "special" && schedule.special?.sessions?.length) {
    const matched = schedule.special.sessions.find((s) => s.date === dateStr);
    if (matched) {
      return {
        scheduled: true,
        startTime: matched.startTime || "08:00",
        endTime: matched.endTime || "18:00",
      };
    }
  }

  return { scheduled: false, startTime: "", endTime: "" };
}

/**
 * Determines whether any assessment session occurs on dateStr and returns its time window.
 */
export function matchAssessmentSessionForDate(
  sessions: AssessmentSessionSlot[] | undefined | null,
  dateStr: string
): { scheduled: boolean; startTime: string; endTime: string } {
  if (!sessions || sessions.length === 0) {
    return { scheduled: false, startTime: "", endTime: "" };
  }
  const matched = sessions.find((s) => s.date === dateStr);
  if (!matched) {
    return { scheduled: false, startTime: "", endTime: "" };
  }
  return {
    scheduled: true,
    startTime: matched.startTime || "08:00",
    endTime: matched.endTime || "18:00",
  };
}

export function formatScheduledCategoryLabel(category: ScheduledCategory): string {
  switch (category) {
    case "class":
      return "Class";
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
      return "Session";
  }
}
