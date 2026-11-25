import "@/modules/users/model";
import "@/modules/subjects/model";
import { Center } from "@/modules/centers/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { Mark } from "./model";
import {
  EvaluationWindowInfo,
  checkAssessmentEvaluationWindow,
} from "./evaluation-window";
import {
  ScheduledCategory,
  matchAssessmentSessionForDate,
} from "@/modules/attendance/schedule";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export type ScheduledEvaluationState = "pending" | "draft" | "completed";

export interface ScheduledEvaluationItem {
  id: string;
  title: string;
  category: ScheduledCategory;
  subject: string;
  classNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passMark: number;
  status: string;
  evaluationStatus: ScheduledEvaluationState;
  evaluationWindow: EvaluationWindowInfo;
  expectedCount: number;
  draftCount: number;
  submittedCount: number;
  evaluatedCount: number;
}

/**
 * Lists assessments (exams, tests, quizzes, papers, assignments) scheduled on the given date
 * that are assigned to the requesting staff evaluator (or teacher/center), enriched with
 * real student counts, evaluation window availability, and mark progress.
 */
export async function getScheduledEvaluationsForDate(params: {
  centerId: string;
  date: string; // "YYYY-MM-DD"
  staffId?: string;
  teacherId?: string;
  now?: Date;
}) {
  await connectDB();
  if (!params.centerId || !mongoose.isValidObjectId(params.centerId)) {
    throw new Error("Valid centerId is required");
  }

  const centerObjId = new mongoose.Types.ObjectId(params.centerId);
  const centerDoc = await Center.findById(centerObjId).select("timezone").lean();
  const timeZone = centerDoc?.timezone || "Asia/Colombo";

  const query: Record<string, unknown> = {
    centerId: centerObjId,
    deletedAt: null,
    "sessions.date": params.date,
  };

  if (params.staffId && mongoose.isValidObjectId(params.staffId)) {
    query.evaluatorIds = new mongoose.Types.ObjectId(params.staffId);
  } else if (params.teacherId && mongoose.isValidObjectId(params.teacherId)) {
    const teacherObjId = new mongoose.Types.ObjectId(params.teacherId);
    const teacherClasses = await ClassModel.find({
      centerId: centerObjId,
      teacherId: teacherObjId,
      deletedAt: null,
    })
      .select("_id")
      .lean();
    query.$or = [
      { createdBy: teacherObjId },
      { classIds: { $in: teacherClasses.map((c) => c._id) } },
    ];
  }

  const assessments = await Assessment.find(query)
    .populate("subjectId", "name code")
    .populate("classIds", "name")
    .lean();

  const matchedAssessments = assessments
    .map((a) => ({
      doc: a,
      match: matchAssessmentSessionForDate(a.sessions, params.date),
    }))
    .filter((item) => item.match.scheduled);

  const assessmentIds = matchedAssessments.map((item) => item.doc._id);
  const linkedClassIds = matchedAssessments.flatMap((item) =>
    ((item.doc.classIds || []) as unknown as Array<
      { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId | null
    >)
      .map((c) => (c && typeof c === "object" && "_id" in c ? c._id : c))
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
  );

  const uniqueClassIds = Array.from(
    new Map(linkedClassIds.map((id) => [id.toString(), id])).values()
  );

  const [enrollments, markCounts] = await Promise.all([
    uniqueClassIds.length > 0
      ? Enrollment.find({ classId: { $in: uniqueClassIds }, status: "active" })
          .select("classId studentId")
          .lean()
      : Promise.resolve([]),
    assessmentIds.length > 0
      ? Mark.aggregate<{
          _id: { assessmentId: mongoose.Types.ObjectId; status: string };
          count: number;
        }>([
          { $match: { assessmentId: { $in: assessmentIds } } },
          {
            $group: {
              _id: { assessmentId: "$assessmentId", status: "$status" },
              count: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const classStudentsMap = new Map<string, Set<string>>();
  for (const e of enrollments) {
    const cKey = e.classId.toString();
    let set = classStudentsMap.get(cKey);
    if (!set) {
      set = new Set<string>();
      classStudentsMap.set(cKey, set);
    }
    set.add(e.studentId.toString());
  }

  const markStatsMap = new Map<string, { draft: number; submitted: number }>();
  for (const row of markCounts) {
    const aKey = row._id.assessmentId.toString();
    const bucket = markStatsMap.get(aKey) || { draft: 0, submitted: 0 };
    if (row._id.status === "submitted") bucket.submitted = row.count;
    else if (row._id.status === "draft") bucket.draft = row.count;
    markStatsMap.set(aKey, bucket);
  }

  const now = params.now || new Date();

  const items: ScheduledEvaluationItem[] = matchedAssessments
    .map(({ doc: a, match }) => {
      const sub = a.subjectId as unknown as { name?: string; code?: string } | null;
      const linkedClasses = (a.classIds || []) as unknown as Array<{
        _id?: mongoose.Types.ObjectId;
        name?: string;
      } | null>;

      const uniqueStudents = new Set<string>();
      const classNames: string[] = [];
      for (const cls of linkedClasses) {
        if (!cls || !cls._id) continue;
        const cid = cls._id.toString();
        if (cls.name) classNames.push(cls.name);
        const studentsInCls = classStudentsMap.get(cid);
        if (studentsInCls) {
          for (const stId of studentsInCls) uniqueStudents.add(stId);
        }
      }

      const idStr = a._id.toString();
      const expectedCount = uniqueStudents.size;
      const stats = markStatsMap.get(idStr) || { draft: 0, submitted: 0 };
      const evaluatedCount = stats.draft + stats.submitted;
      const isCompleted =
        a.status === "completed" ||
        (expectedCount > 0 && stats.submitted >= expectedCount);
      const evaluationStatus: ScheduledEvaluationState = isCompleted
        ? "completed"
        : evaluatedCount > 0 || a.status === "waiting_marks"
        ? "draft"
        : "pending";

      const evaluationWindow = checkAssessmentEvaluationWindow({
        title: a.title,
        sessions: a.sessions,
        status: a.status,
        timeZone,
        now,
      });

      return {
        id: idStr,
        title: a.title,
        category: (a.type || "exam") as ScheduledCategory,
        subject: sub
          ? `${sub.code || ""} - ${sub.name || ""}`.replace(/^ - | - $/g, "")
          : "Assessment",
        classNames,
        date: params.date,
        startTime: match.startTime,
        endTime: match.endTime,
        totalMarks: a.totalMarks,
        passMark: a.passMark,
        status: a.status,
        evaluationStatus,
        evaluationWindow,
        expectedCount,
        draftCount: stats.draft,
        submittedCount: stats.submitted,
        evaluatedCount,
      };
    })
    .sort((a, b) => {
      const timeCmp = a.startTime.localeCompare(b.startTime);
      return timeCmp !== 0 ? timeCmp : a.title.localeCompare(b.title);
    });

  const examsCount = items.filter((i) => i.category === "exam").length;
  const testsCount = items.filter(
    (i) => i.category === "test" || i.category === "mcq_quiz"
  ).length;
  const papersCount = items.filter((i) => i.category === "paper").length;
  const assignmentsCount = items.filter((i) => i.category === "assignment").length;
  const completedCount = items.filter((i) => i.evaluationStatus === "completed").length;

  return {
    date: params.date,
    summary: {
      totalScheduled: items.length,
      examsCount,
      testsCount,
      papersCount,
      assignmentsCount,
      completedCount,
      pendingCount: items.length - completedCount,
    },
    evaluations: items,
  };
}
