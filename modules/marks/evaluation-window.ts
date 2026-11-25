export type EvaluationAvailability = "upcoming" | "ongoing" | "ended";

export interface AssessmentSessionSlot {
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface EvaluationWindowInfo {
  hasEnded: boolean;
  availability: EvaluationAvailability;
  opensAtDate: string | null;
  opensAtTime: string | null;
  message: string | null;
}

export function normalizeTimeHHMM(raw?: string | null, fallback = "00:00"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const parts = raw.trim().split(":");
  if (parts.length < 2) return fallback;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallback;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getCurrentDateTimeInZone(
  now: Date = new Date(),
  timeZone = "Asia/Colombo"
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === "24" ? "00" : map.hour || "00";
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute || "00"}`,
  };
}

function formatReadableDateLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Checks whether an assessment has finished according to its scheduled sessions
 * in the center's timezone. Marks can only be entered once the assessment ends.
 */
export function checkAssessmentEvaluationWindow(params: {
  title?: string;
  sessions?: AssessmentSessionSlot[] | null;
  status?: string;
  timeZone?: string;
  now?: Date;
}): EvaluationWindowInfo {
  if (params.status === "completed") {
    return {
      hasEnded: true,
      availability: "ended",
      opensAtDate: null,
      opensAtTime: null,
      message: null,
    };
  }

  const validSessions = (params.sessions || []).filter(
    (s): s is Required<AssessmentSessionSlot> => Boolean(s?.date)
  );

  if (validSessions.length === 0) {
    if (params.status === "waiting_marks") {
      return {
        hasEnded: true,
        availability: "ended",
        opensAtDate: null,
        opensAtTime: null,
        message: null,
      };
    }
    return {
      hasEnded: false,
      availability: "upcoming",
      opensAtDate: null,
      opensAtTime: null,
      message:
        "Marks cannot be entered yet because this assessment has not finished or has no completed session.",
    };
  }

  const sortedByStart = [...validSessions].sort((a, b) => {
    const ka = `${a.date} ${normalizeTimeHHMM(a.startTime, "00:00")}`;
    const kb = `${b.date} ${normalizeTimeHHMM(b.startTime, "00:00")}`;
    return ka.localeCompare(kb);
  });

  const sortedByEnd = [...validSessions].sort((a, b) => {
    const ka = `${a.date} ${normalizeTimeHHMM(a.endTime, "23:59")}`;
    const kb = `${b.date} ${normalizeTimeHHMM(b.endTime, "23:59")}`;
    return ka.localeCompare(kb);
  });

  const firstSession = sortedByStart[0];
  const lastSession = sortedByEnd[sortedByEnd.length - 1];

  const firstStartTime = normalizeTimeHHMM(firstSession.startTime, "00:00");
  const lastStartTime = normalizeTimeHHMM(lastSession.startTime, "00:00");
  const lastEndTime = normalizeTimeHHMM(lastSession.endTime, "23:59");

  const tz = params.timeZone || "Asia/Colombo";
  const current = getCurrentDateTimeInZone(params.now || new Date(), tz);

  const nowKey = `${current.date} ${current.time}`;
  const startKey = `${firstSession.date} ${firstStartTime}`;
  const endKey = `${lastSession.date} ${lastEndTime}`;

  if (nowKey >= endKey) {
    return {
      hasEnded: true,
      availability: "ended",
      opensAtDate: lastSession.date,
      opensAtTime: lastEndTime,
      message: null,
    };
  }

  const endDateLabel = formatReadableDateLabel(lastSession.date);
  const label = params.title ? `"${params.title}"` : "this assessment";

  if (nowKey < startKey) {
    return {
      hasEnded: false,
      availability: "upcoming",
      opensAtDate: lastSession.date,
      opensAtTime: lastEndTime,
      message: `Marks cannot be entered yet. ${
        params.title ? `${label} has not started yet` : "This assessment has not started yet"
      } — evaluation unlocks after it finishes on ${endDateLabel} at ${lastEndTime}.`,
    };
  }

  return {
    hasEnded: false,
    availability: "ongoing",
    opensAtDate: lastSession.date,
    opensAtTime: lastEndTime,
    message: `${
      params.title ? `${label} is currently in progress` : "This assessment is currently in progress"
    } (${lastStartTime} – ${lastEndTime}). Marks can be entered once it finishes on ${endDateLabel} at ${lastEndTime}.`,
  };
}
