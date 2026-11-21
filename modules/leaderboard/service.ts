import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User, StudentProfile } from "@/modules/users/model";
import { Setting } from "@/modules/settings/model";
import { LeaderboardSnapshot, LeaderboardEntry, ILeaderboardSnapshot } from "./model";
import { computeStudentScore } from "@/modules/analysis/engine/score";

export interface FormattedLeaderboardEntry {
  id: string;
  rank: number;
  gradeRank: number;
  previousRank?: number;
  movement: "up" | "down" | "same" | "new";
  movementDelta: number;
  studentId: string;
  studentName: string;
  grade: string;
  score: number;
  marksScore: number;
  attendanceScore: number;
  isCurrentUser?: boolean;
}

export class LeaderboardService {
  /**
   * Syncs the leaderboard for a center: recomputes all scores and ranks.
   */
  static async syncLeaderboard(
    centerId: string,
    source: "cron" | "manual" = "cron",
    actorId?: string
  ): Promise<{ snapshot: ILeaderboardSnapshot; count: number }> {
    await connectDB();
    const centerObjId = new mongoose.Types.ObjectId(centerId);

    // 1. Fetch settings
    const settings = await Setting.find({
      centerId: centerObjId,
      key: { $in: ["leaderboard.minAssessments", "leaderboard.minSessions"] },
    }).lean();

    const minAssessments = (settings.find((s) => s.key === "leaderboard.minAssessments")?.value as number) ?? 3;
    const minSessions = (settings.find((s) => s.key === "leaderboard.minSessions")?.value as number) ?? 5;

    // 2. Fetch all active students in center
    const students = await User.find({
      centerId: centerObjId,
      role: "student",
      status: "active",
      deletedAt: null,
    }).lean();

    const profiles = await StudentProfile.find({
      userId: { $in: students.map((s) => s._id) },
    }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // 3. Compute score for each student
    const studentScores = await Promise.all(
      students.map(async (st) => {
        const scoreRes = await computeStudentScore(st._id);
        const prof = profileMap.get(st._id.toString());
        return {
          student: st,
          grade: prof?.grade || "Grade 10",
          scoreRes,
        };
      })
    );

    // 4. Filter by minimum requirements
    const eligible = studentScores.filter(
      (item) =>
        item.scoreRes.score !== null &&
        item.scoreRes.countedAssessments >= minAssessments &&
        item.scoreRes.countedSessions >= minSessions
    );

    // 5. Apply the 5 Tie-Breakers in order:
    // (1) higher score, (2) higher Marks Score, (3) higher Attendance Score, (4) more submitted assessments, (5) name
    eligible.sort((a, b) => {
      // 1. Higher score
      const diffScore = (b.scoreRes.displayScore ?? 0) - (a.scoreRes.displayScore ?? 0);
      if (diffScore !== 0) return diffScore;

      // 2. Higher Marks Score
      const diffMarks = (b.scoreRes.marksScore ?? 0) - (a.scoreRes.marksScore ?? 0);
      if (diffMarks !== 0) return diffMarks;

      // 3. Higher Attendance Score
      const diffAtt = (b.scoreRes.attendanceScore ?? 0) - (a.scoreRes.attendanceScore ?? 0);
      if (diffAtt !== 0) return diffAtt;

      // 4. More submitted assessments
      const diffCount = b.scoreRes.countedAssessments - a.scoreRes.countedAssessments;
      if (diffCount !== 0) return diffCount;

      // 5. Name alphabetical
      return a.student.name.localeCompare(b.student.name);
    });

    // 6. Find previous latest snapshot for previous ranks
    const previousSnapshot = await LeaderboardSnapshot.findOne({
      centerId: centerObjId,
      isLatest: true,
    }).lean();

    const previousRankMap = new Map<string, number>();
    if (previousSnapshot) {
      const prevEntries = await LeaderboardEntry.find({ snapshotId: previousSnapshot._id }).lean();
      prevEntries.forEach((pe) => previousRankMap.set(pe.studentId.toString(), pe.rank));
    }

    // 7. Mark old snapshots as not latest
    await LeaderboardSnapshot.updateMany(
      { centerId: centerObjId, isLatest: true },
      { $set: { isLatest: false } }
    );

    // 8. Create new snapshot
    const now = new Date();
    const newSnapshot = await LeaderboardSnapshot.create({
      centerId: centerObjId,
      syncedAt: now,
      source,
      triggeredBy: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      isLatest: true,
    });

    // 9. Create entries with overall and grade-specific ranks
    const gradeCounterMap = new Map<string, number>();
    const entryDocs = eligible.map((item, idx) => {
      const overallRank = idx + 1;
      const currentGradeCount = (gradeCounterMap.get(item.grade) || 0) + 1;
      gradeCounterMap.set(item.grade, currentGradeCount);

      const prevRank = previousRankMap.get(item.student._id.toString());

      return {
        snapshotId: newSnapshot._id,
        studentId: item.student._id,
        studentName: item.student.name,
        grade: item.grade,
        rank: overallRank,
        gradeRank: currentGradeCount,
        score: item.scoreRes.displayScore ?? 0,
        marksScore: item.scoreRes.marksScore ? Math.round(item.scoreRes.marksScore) : 0,
        attendanceScore: item.scoreRes.attendanceScore ? Math.round(item.scoreRes.attendanceScore) : 0,
        previousRank: prevRank,
      };
    });

    if (entryDocs.length > 0) {
      await LeaderboardEntry.insertMany(entryDocs);
    }

    return { snapshot: newSnapshot, count: entryDocs.length };
  }

  /**
   * Fetches latest leaderboard with Top 10 and current student position.
   */
  static async getLeaderboard(params: {
    centerId: string;
    grade?: string;
    studentId?: string;
  }) {
    await connectDB();
    const centerObjId = new mongoose.Types.ObjectId(params.centerId);

    // 1. Fetch settings
    const settings = await Setting.find({
      centerId: centerObjId,
      key: { $in: ["leaderboard.showFullNames", "leaderboard.showToStudents"] },
    }).lean();

    const showFullNames = (settings.find((s) => s.key === "leaderboard.showFullNames")?.value as boolean) ?? true;
    const showToStudents = (settings.find((s) => s.key === "leaderboard.showToStudents")?.value as boolean) ?? true;

    // 2. Fetch latest snapshot
    const snapshot = await LeaderboardSnapshot.findOne({
      centerId: centerObjId,
      isLatest: true,
    }).lean();

    if (!snapshot) {
      return {
        snapshot: null,
        top10: [],
        myEntry: null,
        showToStudents,
      };
    }

    // 3. Query entries
    const filter: Record<string, unknown> = { snapshotId: snapshot._id };
    if (params.grade && params.grade !== "all") {
      filter.grade = params.grade;
    }

    const entries = await LeaderboardEntry.find(filter)
      .sort({ [params.grade && params.grade !== "all" ? "gradeRank" : "rank"]: 1 })
      .limit(10)
      .lean();

    const formatName = (fullName: string) => {
      if (showFullNames) return fullName;
      const parts = fullName.split(" ");
      if (parts.length <= 1) return fullName;
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    };

    const formatEntry = (e: typeof entries[0]): FormattedLeaderboardEntry => {
      let movement: "up" | "down" | "same" | "new" = "new";
      let movementDelta = 0;

      if (typeof e.previousRank === "number") {
        if (e.previousRank > e.rank) {
          movement = "up";
          movementDelta = e.previousRank - e.rank;
        } else if (e.previousRank < e.rank) {
          movement = "down";
          movementDelta = e.rank - e.previousRank;
        } else {
          movement = "same";
          movementDelta = 0;
        }
      }

      return {
        id: e._id.toString(),
        rank: e.rank,
        gradeRank: e.gradeRank,
        previousRank: e.previousRank,
        movement,
        movementDelta,
        studentId: e.studentId.toString(),
        studentName: formatName(e.studentName),
        grade: e.grade,
        score: e.score,
        marksScore: e.marksScore,
        attendanceScore: e.attendanceScore,
        isCurrentUser: params.studentId ? e.studentId.toString() === params.studentId : false,
      };
    };

    const top10 = entries.map(formatEntry);

    // 4. Viewer's own place if student
    let myEntry: {
      entry: FormattedLeaderboardEntry | null;
      distanceToTop10: number | null;
      hasEnoughData: boolean;
    } | null = null;

    if (params.studentId) {
      const sId = new mongoose.Types.ObjectId(params.studentId);
      const ownRecord = await LeaderboardEntry.findOne({
        snapshotId: snapshot._id,
        studentId: sId,
      }).lean();

      if (ownRecord) {
        const tenthEntry = top10.length >= 10 ? top10[9] : top10[top10.length - 1];
        const dist = tenthEntry && ownRecord.rank > 10 ? Math.max(1, tenthEntry.score - ownRecord.score) : 0;
        myEntry = {
          entry: formatEntry(ownRecord),
          distanceToTop10: dist,
          hasEnoughData: true,
        };
      } else {
        myEntry = {
          entry: null,
          distanceToTop10: null,
          hasEnoughData: false,
        };
      }
    }

    return {
      snapshot: {
        id: snapshot._id.toString(),
        syncedAt: snapshot.syncedAt,
        source: snapshot.source,
      },
      top10,
      myEntry,
      showToStudents,
    };
  }
}
