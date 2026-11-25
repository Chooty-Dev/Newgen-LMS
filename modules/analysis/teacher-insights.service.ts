import "@/modules/subjects/model";
import { Mark } from "@/modules/marks/model";
import { Attendance } from "@/modules/attendance/model";
import { User, StudentProfile } from "@/modules/users/model";
import { Enrollment } from "@/modules/classes/model";
import { StudentTeacherInsight, InsightRefreshLimit } from "./model";
import { computeImprovementScore, MarkItem } from "./engine";
import { computeStudentScore } from "./engine/score";
import {
  TeacherStudentInsightReport,
  computeStudentInsightFingerprint,
  generateTeacherStudentInsights,
} from "./gemini-advisor";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const REFRESH_QUOTA_LIMIT = 3;
export const REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

export class TeacherInsightActionError extends Error {
  code: "REFRESH_QUOTA_EXCEEDED" | "NO_NEW_DATA";
  statusCode: number;
  unlocksAt?: string | null;
  quota?: RefreshQuotaInfo;

  constructor(
    code: "REFRESH_QUOTA_EXCEEDED" | "NO_NEW_DATA",
    statusCode: number,
    message: string,
    unlocksAt?: string | null,
    quota?: RefreshQuotaInfo
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.unlocksAt = unlocksAt;
    this.quota = quota;
  }
}

export interface RefreshQuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  isLocked: boolean;
  unlocksAt: string | null;
}

export function normalizeClientIp(ip?: string): string | null {
  const cleaned = (ip || "").trim().toLowerCase().replace(/^::ffff:/, "");
  if (!cleaned) return null;
  if (cleaned === "::1") return "127.0.0.1";
  return cleaned;
}

export function buildQuotaScopeKeys(params: {
  actorId?: string;
  sessionId?: string;
  ipAddress?: string;
}): string[] {
  const keys: string[] = [];
  if (params.actorId) keys.push(`user:${params.actorId}`);
  if (params.sessionId) keys.push(`session:${params.sessionId}`);
  const ip = normalizeClientIp(params.ipAddress);
  if (ip) keys.push(`ip:${ip}`);
  return Array.from(new Set(keys));
}

export function computeRollingQuota(
  timestamps: Array<Date | string> | undefined | null,
  now: Date = new Date()
): { activeDates: Date[]; quota: RefreshQuotaInfo } {
  const cutoffMs = now.getTime() - REFRESH_WINDOW_MS;
  const activeDates = (timestamps || [])
    .map((t) => new Date(t))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() > cutoffMs)
    .sort((a, b) => a.getTime() - b.getTime());

  const used = activeDates.length;
  const remaining = Math.max(0, REFRESH_QUOTA_LIMIT - used);
  const isLocked = used >= REFRESH_QUOTA_LIMIT;
  const unlocksAt =
    isLocked && activeDates[0]
      ? new Date(activeDates[0].getTime() + REFRESH_WINDOW_MS).toISOString()
      : null;

  return {
    activeDates,
    quota: {
      limit: REFRESH_QUOTA_LIMIT,
      used,
      remaining,
      isLocked,
      unlocksAt,
    },
  };
}

/**
 * Produces a teacher-oriented full student analysis with MongoDB persistence:
 * - Normal opens (forceRefresh=false) serve the stored DB report with 0 AI calls,
 *   or generate & store on first ever open (Option A) with 0 refresh quota spent.
 * - Manual refreshes count strictly against a rolling 3-per-24h limit enforced across
 *   the logged-in user, session, and client IP, locking all of them for 24h after 3 clicks.
 */
export async function getStudentTeacherInsights(
  idOrUsername: string,
  options?: {
    forceRefresh?: boolean;
    actorId?: string;
    sessionId?: string;
    ipAddress?: string;
    now?: Date;
  }
) {
  await connectDB();

  let user = null;
  if (mongoose.isValidObjectId(idOrUsername)) {
    user = await User.findOne({
      _id: new mongoose.Types.ObjectId(idOrUsername),
      role: "student",
      deletedAt: null,
    }).lean();
  }
  if (!user) {
    user = await User.findOne({
      username: idOrUsername.toLowerCase(),
      role: "student",
      deletedAt: null,
    }).lean();
  }
  if (!user) {
    throw new Error("Student not found");
  }

  const sId = user._id;
  const actorObjId =
    options?.actorId && mongoose.isValidObjectId(options.actorId)
      ? new mongoose.Types.ObjectId(options.actorId)
      : sId;
  const effectiveActorKey = options?.actorId || sId.toString();
  const scopeKeys = buildQuotaScopeKeys({
    actorId: effectiveActorKey,
    sessionId: options?.sessionId,
    ipAddress: options?.ipAddress,
  });
  const now = options?.now || new Date();

  const [profile, marks, attendanceRecords, scoreResult, enrolledClassesCount, savedDoc, limitDocs] =
    await Promise.all([
      StudentProfile.findOne({ userId: sId }).lean(),
      Mark.find({ studentId: sId, status: "submitted" })
        .populate("subjectId", "name code")
        .populate("assessmentId", "title sessions")
        .sort({ evaluatedAt: 1, createdAt: 1 })
        .lean(),
      Attendance.find({ studentId: sId }).sort({ date: 1 }).lean(),
      computeStudentScore(sId),
      Enrollment.countDocuments({ studentId: sId, status: "active" }),
      StudentTeacherInsight.findOne({ studentId: sId }).lean(),
      scopeKeys.length > 0
        ? InsightRefreshLimit.find({ scopeKey: { $in: scopeKeys } }).lean()
        : Promise.resolve([]),
    ]);

  const markItems: MarkItem[] = marks.map((m) => {
    const sub = m.subjectId as unknown as { name?: string } | null;
    return {
      score: m.score,
      totalMarks: m.totalMarks,
      percentage: m.percentage,
      weight: 1.0,
      date: m.evaluatedAt || m.createdAt,
      subject: sub?.name || "Subject",
      type: m.type,
    };
  });

  const overallScore = scoreResult.displayScore ?? 0;
  const marksScore = scoreResult.marksScore !== null ? Math.round(scoreResult.marksScore) : null;
  const attendanceScore =
    scoreResult.attendanceScore !== null ? Math.round(scoreResult.attendanceScore) : null;
  const improvementScore = computeImprovementScore(markItems);

  const subjectComparison = scoreResult.subjects.map((s) => ({
    subject: s.subjectName,
    average: Math.round(s.score),
    count: s.assessmentCount,
  }));

  const typeMap = new Map<string, { total: number; count: number }>();
  for (const m of marks) {
    const label =
      m.type === "exam"
        ? "Exams"
        : m.type === "mcq_quiz"
        ? "Quizzes"
        : m.type === "assignment"
        ? "Assignments"
        : m.type === "paper"
        ? "Papers"
        : "Tests";
    const curr = typeMap.get(label) || { total: 0, count: 0 };
    curr.total += m.percentage;
    curr.count += 1;
    typeMap.set(label, curr);
  }
  const typeComparison = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    average: Math.round(data.total / data.count),
  }));

  const monthMap = new Map<string, { attended: number; total: number }>();
  for (const a of attendanceRecords) {
    const monthKey = a.date.slice(0, 7);
    const curr = monthMap.get(monthKey) || { attended: 0, total: 0 };
    curr.total += 1;
    if (a.status === "present" || a.status === "late" || a.status === "excused") {
      curr.attended += 1;
    }
    monthMap.set(monthKey, curr);
  }
  const monthlyAttendance = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    percentage: Math.round((data.attended / Math.max(1, data.total)) * 100),
  }));

  const recentMarks = marks.slice(-10).map((m) => {
    const sub = m.subjectId as unknown as { name?: string } | null;
    const assess = m.assessmentId as unknown as { title?: string } | null;
    return {
      title: assess?.title || "Assessment",
      subject: sub?.name || "Subject",
      type: m.type,
      percentage: m.percentage,
      grade: m.grade,
      date: (m.evaluatedAt || m.createdAt).toISOString().slice(0, 10),
    };
  });

  const insightInput = {
    studentId: sId.toString(),
    name: user.name,
    grade: profile?.grade || "-",
    overallScore,
    marksScore,
    attendanceScore,
    improvementScore,
    group: scoreResult.group,
    groupLabel: scoreResult.groupLabel,
    attendanceBreakdown: scoreResult.attendanceBreakdown,
    subjectComparison,
    typeComparison,
    recentMarks,
    enrolledClassesCount,
  };

  const currentFingerprint = computeStudentInsightFingerprint(insightInput);
  const scopeResults = scopeKeys.map((scopeKey) => {
    const doc = limitDocs.find((d) => d.scopeKey === scopeKey);
    return {
      scopeKey,
      ...computeRollingQuota(doc?.refreshTimestamps, now),
    };
  });

  const maxUsed = Math.min(
    REFRESH_QUOTA_LIMIT,
    scopeResults.reduce((max, r) => Math.max(max, r.quota.used), 0)
  );
  const effectiveLocked = maxUsed >= REFRESH_QUOTA_LIMIT;
  const lockedUnlockTimes = scopeResults
    .filter((r) => r.quota.isLocked && r.quota.unlocksAt)
    .map((r) => new Date(r.quota.unlocksAt!).getTime());
  const effectiveUnlocksAt =
    lockedUnlockTimes.length > 0
      ? new Date(Math.max(...lockedUnlockTimes)).toISOString()
      : null;

  let currentQuota: RefreshQuotaInfo = {
    limit: REFRESH_QUOTA_LIMIT,
    used: maxUsed,
    remaining: Math.max(0, REFRESH_QUOTA_LIMIT - maxUsed),
    isLocked: effectiveLocked,
    unlocksAt: effectiveUnlocksAt,
  };

  const hasNewData = !savedDoc || savedDoc.dataFingerprint !== currentFingerprint;

  let insights: TeacherStudentInsightReport;
  let servedFromCacheDb = false;
  let resultHasNewData = hasNewData;

  if (!options?.forceRefresh && savedDoc) {
    // Serve directly from MongoDB without invoking Gemini
    insights = savedDoc.report as TeacherStudentInsightReport;
    servedFromCacheDb = true;
  } else {
    if (options?.forceRefresh) {
      if (currentQuota.isLocked) {
        throw new TeacherInsightActionError(
          "REFRESH_QUOTA_EXCEEDED",
          429,
          "You have reached the maximum of 3 refreshes for today. Your session and IP are locked for 24 hours.",
          currentQuota.unlocksAt,
          currentQuota
        );
      }

      // Count EVERY manual refresh click immediately across user, session, and IP
      const updatedScopes = await Promise.all(
        scopeResults.map(async (r) => {
          const updatedTimestamps = [...r.activeDates, now];
          await InsightRefreshLimit.findOneAndUpdate(
            { scopeKey: r.scopeKey },
            { $set: { refreshTimestamps: updatedTimestamps } },
            { upsert: true, returnDocument: "after" }
          );
          return computeRollingQuota(updatedTimestamps, now).quota;
        })
      );

      const nextUsed = Math.min(
        REFRESH_QUOTA_LIMIT,
        updatedScopes.reduce((max, q) => Math.max(max, q.used), 0)
      );
      const nextLocked = nextUsed >= REFRESH_QUOTA_LIMIT;
      const nextUnlockTimes = updatedScopes
        .filter((q) => q.isLocked && q.unlocksAt)
        .map((q) => new Date(q.unlocksAt!).getTime());
      currentQuota = {
        limit: REFRESH_QUOTA_LIMIT,
        used: nextUsed,
        remaining: Math.max(0, REFRESH_QUOTA_LIMIT - nextUsed),
        isLocked: nextLocked,
        unlocksAt:
          nextUnlockTimes.length > 0
            ? new Date(Math.max(...nextUnlockTimes)).toISOString()
            : null,
      };
    }

    insights = await generateTeacherStudentInsights(insightInput);

    // Replace existing MongoDB insight cleanly (1 record per student)
    await StudentTeacherInsight.findOneAndUpdate(
      { studentId: sId },
      {
        $set: {
          dataFingerprint: currentFingerprint,
          report: insights,
          generatedBy: actorObjId,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    resultHasNewData = false;
  }

  return {
    student: {
      id: sId.toString(),
      name: user.name,
      username: user.username,
      admissionNo: profile?.admissionNo || "-",
      grade: profile?.grade || "-",
    },
    metrics: {
      overallScore,
      hasGradedScore: scoreResult.displayScore !== null,
      marksScore,
      attendanceScore,
      improvementScore,
      group: scoreResult.group,
      groupLabel: scoreResult.groupLabel,
      attendanceBreakdown: scoreResult.attendanceBreakdown,
      enrolledClassesCount,
      assessmentsCount: marks.length,
    },
    subjectComparison,
    typeComparison,
    monthlyAttendance,
    recentMarks,
    insights,
    refreshMeta: {
      servedFromCacheDb,
      hasNewData: resultHasNewData,
      lastGeneratedAt: insights.generatedAt,
      quota: currentQuota,
    },
  };
}
