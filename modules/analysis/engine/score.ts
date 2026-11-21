import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Mark } from "@/modules/marks/model";
import { Attendance } from "@/modules/attendance/model";
import { IAssessment } from "@/modules/exams/model";
import { Enrollment } from "@/modules/classes/model";
import { Setting } from "@/modules/settings/model";
import { PerformanceSnapshot, IPerformanceSnapshot } from "@/modules/analysis/model";

export interface SubjectAssessmentItem {
  id: string;
  title: string;
  type: string;
  score: number;
  totalMarks: number;
  percentage: number;
  weight: number;
  attendanceStatus: string;
  date: string;
}

export interface SubjectScoreBreakdown {
  subjectId: string;
  subjectName: string;
  score: number;
  assessmentCount: number;
  assessments: SubjectAssessmentItem[];
}

export interface AttendanceScoreBreakdown {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  totalFinalized: number;
  countedSessions: number;
  points: number;
}

export interface StudentScoreResult {
  studentId: string;
  asOfDate: Date;
  score: number | null; // null if no submitted marks
  displayScore: number | null; // rounded half up, or null
  marksScore: number | null;
  attendanceScore: number | null;
  weights: { marks: number; attendance: number };
  countedAssessments: number;
  countedSessions: number;
  subjects: SubjectScoreBreakdown[];
  attendanceBreakdown: AttendanceScoreBreakdown;
  group: "weak" | "medium" | "excellent";
  groupLabel: string;
  statusText: string;
}

const DEFAULT_TYPE_WEIGHTS: Record<string, number> = {
  exam: 3,
  test: 2,
  paper: 2,
  mcq_quiz: 1,
  assignment: 1,
};

/**
 * Pure calculation function for score from in-memory structured data.
 * Ideal for unit testing without MongoDB connection.
 */
export function calculateScoreFromData(params: {
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    assessments: Array<{
      id: string;
      title: string;
      type: string;
      score: number;
      totalMarks: number;
      weight?: number;
      attendanceStatus: "present" | "absent" | "excused";
      status: "draft" | "submitted";
      deleted?: boolean;
    }>;
  }>;
  attendance: Array<{
    status: "present" | "late" | "absent" | "excused";
    isFinalized: boolean;
  }>;
  weights?: { marks: number; attendance: number };
  typeWeights?: Record<string, number>;
  countAbsentAsZero?: boolean;
}): {
  score: number | null;
  displayScore: number | null;
  marksScore: number | null;
  attendanceScore: number | null;
  weights: { marks: number; attendance: number };
  countedAssessments: number;
  countedSessions: number;
  subjects: SubjectScoreBreakdown[];
  attendanceBreakdown: AttendanceScoreBreakdown;
  group: "weak" | "medium" | "excellent";
  groupLabel: string;
  statusText: string;
} {
  const activeTypeWeights = { ...DEFAULT_TYPE_WEIGHTS, ...(params.typeWeights || {}) };
  const countAbsentAsZero = params.countAbsentAsZero !== false;

  // 1. Process Marks per Subject
  const processedSubjects: SubjectScoreBreakdown[] = [];
  let totalCountedAssessments = 0;

  for (const sub of params.subjects) {
    const validAssessments: SubjectAssessmentItem[] = [];
    let weightedPercentageSum = 0;
    let totalWeightSum = 0;

    for (const a of sub.assessments) {
      if (a.status !== "submitted" || a.deleted) continue;
      if (a.attendanceStatus === "excused") continue; // Excused is ignored

      let percentage = 0;
      if (a.attendanceStatus === "absent") {
        if (!countAbsentAsZero) continue;
        percentage = 0;
      } else {
        percentage = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0;
      }

      // Assessment weight overrides default type weight if positive
      const weight = typeof a.weight === "number" && a.weight > 0
        ? a.weight
        : activeTypeWeights[a.type] ?? 1;

      weightedPercentageSum += percentage * weight;
      totalWeightSum += weight;

      validAssessments.push({
        id: a.id,
        title: a.title,
        type: a.type,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: Math.round(percentage * 100) / 100,
        weight,
        attendanceStatus: a.attendanceStatus,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    if (validAssessments.length > 0 && totalWeightSum > 0) {
      const subjectAverage = weightedPercentageSum / totalWeightSum;
      processedSubjects.push({
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        score: Math.round(subjectAverage * 100) / 100,
        assessmentCount: validAssessments.length,
        assessments: validAssessments,
      });
      totalCountedAssessments += validAssessments.length;
    }
  }

  // Marks Score = simple average of all subject scores
  let marksScore: number | null = null;
  if (processedSubjects.length > 0) {
    const sumSubjectScores = processedSubjects.reduce((acc, s) => acc + s.score, 0);
    marksScore = Math.round((sumSubjectScores / processedSubjects.length) * 100) / 100;
  }

  // 2. Process Attendance
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let finalizedCount = 0;

  for (const att of params.attendance) {
    if (!att.isFinalized) continue;
    finalizedCount++;

    if (att.status === "excused") {
      excusedCount++;
      continue; // Excused is removed from count
    } else if (att.status === "present") {
      presentCount++;
    } else if (att.status === "late") {
      lateCount++;
    } else if (att.status === "absent") {
      absentCount++;
    }
  }

  const countedSessions = presentCount + lateCount + absentCount;
  const attendancePoints = presentCount * 1.0 + lateCount * 0.5;

  let attendanceScore: number | null = null;
  if (countedSessions > 0) {
    attendanceScore = Math.round((attendancePoints / countedSessions) * 100 * 100) / 100;
  }

  // 3. Normalize Weights
  const rawMarksWeight = params.weights?.marks ?? 75;
  const rawAttWeight = params.weights?.attendance ?? 25;
  const sumWeights = rawMarksWeight + rawAttWeight;
  const normMarksWeight = sumWeights > 0 ? rawMarksWeight / sumWeights : 0.75;
  const normAttWeight = sumWeights > 0 ? rawAttWeight / sumWeights : 0.25;

  // 4. Combined Score Calculation
  let finalScore: number | null = null;
  let statusText = "Good Standing";

  if (marksScore === null) {
    // Edge case: No marks yet -> null
    finalScore = null;
    statusText = "Not enough marks yet";
  } else if (attendanceScore === null) {
    // Marks but no attendance yet: use marks score only
    finalScore = Math.min(100, Math.max(0, Math.round(marksScore * 10) / 10));
    statusText = "Marks only";
  } else {
    // Standard formula: (Marks Score x 75%) + (Attendance Score x 25%)
    const rawScore = marksScore * normMarksWeight + attendanceScore * normAttWeight;
    finalScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));
  }

  const displayScore = finalScore !== null ? Math.round(finalScore) : null;

  let group: "weak" | "medium" | "excellent" = "medium";
  let groupLabel = "Doing well!";
  if (displayScore !== null) {
    if (displayScore >= 75) {
      group = "excellent";
      groupLabel = "Great job!";
    } else if (displayScore >= 50) {
      group = "medium";
      groupLabel = "Doing well!";
    } else {
      group = "weak";
      groupLabel = "Keep going!";
    }
  } else {
    groupLabel = "Welcome!";
  }

  return {
    score: finalScore,
    displayScore,
    marksScore,
    attendanceScore,
    weights: {
      marks: Math.round(normMarksWeight * 100),
      attendance: Math.round(normAttWeight * 100),
    },
    countedAssessments: totalCountedAssessments,
    countedSessions,
    subjects: processedSubjects,
    attendanceBreakdown: {
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      totalFinalized: finalizedCount,
      countedSessions,
      points: attendancePoints,
    },
    group,
    groupLabel,
    statusText,
  };
}

/**
 * The single source of truth for computing a student's score from the database.
 * No duplicate formulas anywhere.
 */
export async function computeStudentScore(
  studentId: string | mongoose.Types.ObjectId,
  asOfDate?: Date | string
): Promise<StudentScoreResult> {
  await connectDB();
  const sId = new mongoose.Types.ObjectId(studentId);
  const cutoff = asOfDate ? new Date(asOfDate) : new Date();
  const cutoffDateStr = cutoff.toISOString().slice(0, 10);

  // 1. Fetch system weights & settings
  const settings = await Setting.find({
    key: { $in: ["score.weights", "score.typeWeights", "score.countAbsentAsZero", "performanceWeights"] },
  }).lean();

  const weightsSetting = (settings.find((s) => s.key === "score.weights")?.value ||
    settings.find((s) => s.key === "performanceWeights")?.value) as
    | { marks: number; attendance: number }
    | undefined;

  const typeWeightsSetting = settings.find((s) => s.key === "score.typeWeights")?.value as
    | Record<string, number>
    | undefined;

  const countAbsentSetting = settings.find((s) => s.key === "score.countAbsentAsZero")?.value as
    | boolean
    | undefined;

  // 2. Fetch student's enrolled classes up to cutoff
  const enrollments = await Enrollment.find({
    studentId: sId,
    enrolledAt: { $lte: cutoff },
  }).lean();
  const enrolledClassIds = enrollments.map((e) => e.classId.toString());

  // 3. Fetch non-deleted submitted marks
  const marks = await Mark.find({
    studentId: sId,
    status: "submitted",
    createdAt: { $lte: cutoff },
  })
    .populate<{ assessmentId: IAssessment }>("assessmentId")
    .populate<{ subjectId: { _id: mongoose.Types.ObjectId; name: string } }>("subjectId")
    .lean();

  // Group marks by subject
  const subjectMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    assessments: Array<{
      id: string;
      title: string;
      type: string;
      score: number;
      totalMarks: number;
      weight?: number;
      attendanceStatus: "present" | "absent" | "excused";
      status: "draft" | "submitted";
      deleted?: boolean;
    }>;
  }>();

  for (const m of marks) {
    const a = m.assessmentId;
    if (!a || a.deletedAt) continue; // Skip deleted assessments

    // If assessment is scoped to classes, ensure student was enrolled in one of them
    if (a.classIds && a.classIds.length > 0 && enrolledClassIds.length > 0) {
      const match = a.classIds.some((cid) => enrolledClassIds.includes(cid.toString()));
      if (!match) continue;
    }

    const sub = m.subjectId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | null;
    const subId = sub?._id?.toString() || a.subjectId?.toString() || "default";
    const subName = sub?.name || "Subject";

    const curr = subjectMap.get(subId) || {
      subjectId: subId,
      subjectName: subName,
      assessments: [],
    };

    curr.assessments.push({
      id: a._id.toString(),
      title: a.title,
      type: m.type || a.type,
      score: m.score,
      totalMarks: m.totalMarks || a.totalMarks,
      weight: a.weight,
      attendanceStatus: m.attendanceStatus,
      status: m.status,
      deleted: !!a.deletedAt,
    });

    subjectMap.set(subId, curr);
  }

  // 4. Fetch finalized attendance sessions up to cutoff
  const attendanceRecords = await Attendance.find({
    studentId: sId,
    date: { $lte: cutoffDateStr },
  })
    .populate<{ sessionId: { _id: mongoose.Types.ObjectId; status: "open" | "finalized" } }>("sessionId")
    .lean();

  const attendanceItems: Array<{
    status: "present" | "late" | "absent" | "excused";
    isFinalized: boolean;
  }> = attendanceRecords.map((r) => ({
    status: r.status,
    isFinalized: r.sessionId?.status === "finalized",
  }));

  // 5. Run calculation engine
  const calculation = calculateScoreFromData({
    subjects: Array.from(subjectMap.values()),
    attendance: attendanceItems,
    weights: weightsSetting,
    typeWeights: typeWeightsSetting,
    countAbsentAsZero: countAbsentSetting,
  });

  return {
    studentId: sId.toString(),
    asOfDate: cutoff,
    ...calculation,
  };
}

/**
 * Recompute and store today's snapshot for a student in `performanceSnapshots`.
 */
export async function saveDailyPerformanceSnapshot(
  studentId: string | mongoose.Types.ObjectId,
  date?: string | Date,
  events?: Array<{ date: string; description: string; type: string }>
): Promise<IPerformanceSnapshot> {
  await connectDB();
  const sId = new mongoose.Types.ObjectId(studentId);
  const targetDate = date ? new Date(date) : new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  const res = await computeStudentScore(sId, targetDate);

  const snapshot = await PerformanceSnapshot.findOneAndUpdate(
    { studentId: sId, date: dateStr },
    {
      $set: {
        score: res.score,
        marksScore: res.marksScore,
        attendanceScore: res.attendanceScore,
        group: res.group,
        period: dateStr, // keep period aligned with daily date
        countedAssessments: res.countedAssessments,
        countedSessions: res.countedSessions,
        computedAt: new Date(),
        ...(events && events.length > 0 ? { events } : {}),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return snapshot;
}
