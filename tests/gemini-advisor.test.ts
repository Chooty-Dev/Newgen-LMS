import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { User, StudentProfile } from "@/modules/users/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { Mark } from "@/modules/marks/model";
import { AttendanceSession, Attendance } from "@/modules/attendance/model";
import { AnalysisService } from "@/modules/analysis/service";
import {
  buildDeterministicTeacherReport,
  generateTeacherStudentInsights,
  StudentInsightInput,
} from "@/modules/analysis/gemini-advisor";

describe("Teacher Student Insights & Gemini Fallback Engine", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("builds detailed deterministic teacher insights automatically when Gemini key is absent or rate-limited", async () => {
    const sampleInput: StudentInsightInput = {
      studentId: "stu-fallback-1",
      name: "Kavindu Perera",
      grade: "Grade 11",
      overallScore: 46,
      marksScore: 44,
      attendanceScore: 60,
      improvementScore: 35,
      group: "weak",
      groupLabel: "Needs Help",
      attendanceBreakdown: {
        presentCount: 6,
        lateCount: 2,
        absentCount: 4,
        excusedCount: 0,
        totalFinalized: 12,
      },
      subjectComparison: [
        { subject: "Mathematics", average: 38, count: 3 },
        { subject: "English Language", average: 76, count: 2 },
      ],
      typeComparison: [
        { type: "Exams", average: 36 },
        { type: "Tests", average: 58 },
      ],
      recentMarks: [
        { title: "Test 1", subject: "Mathematics", type: "test", percentage: 60, grade: "C", date: "2026-11-01" },
        { title: "Test 2", subject: "Mathematics", type: "test", percentage: 56, grade: "C", date: "2026-11-08" },
        { title: "Mid Term", subject: "Mathematics", type: "exam", percentage: 38, grade: "F", date: "2026-11-15" },
        { title: "Final Mock", subject: "Mathematics", type: "exam", percentage: 34, grade: "F", date: "2026-11-22" },
      ],
      enrolledClassesCount: 2,
    };

    const deterministic = buildDeterministicTeacherReport(sampleInput, "manual_test");
    expect(deterministic.source).toBe("fallback");
    expect(deterministic.futureOutlook.trajectory).toBe("at_risk");
    expect(deterministic.weakPoints.some((p) => p.includes("Mathematics"))).toBe(true);
    expect(deterministic.plusPoints.some((p) => p.includes("English Language"))).toBe(true);
    expect(deterministic.howToImproveOrSustain.length).toBeGreaterThanOrEqual(2);

    // Simulate GEMINI_API_KEY configured but Gemini returning 429 rate-limit quota exhausted
    process.env.GEMINI_API_KEY = "dummy-test-key";
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 429, message: "Quota exceeded" } }), {
        status: 429,
      })
    );

    const quotaFallback = await generateTeacherStudentInsights(sampleInput);
    expect(quotaFallback.source).toBe("fallback");
    expect(quotaFallback.fallbackReason).toBe("gemini_http_429");
    expect(quotaFallback.headline).toContain("Kavindu");
    expect(quotaFallback.futureOutlook.targetScoreEstimate).toBeGreaterThan(sampleInput.overallScore);
  });

  it("uses Gemini structured insights when API succeeds and falls back seamlessly on malformed output", async () => {
    const sampleInput: StudentInsightInput = {
      studentId: "stu-gemini-1",
      name: "Nethmi Silva",
      grade: "Grade 11",
      overallScore: 86,
      marksScore: 88,
      attendanceScore: 95,
      improvementScore: 68,
      group: "excellent",
      groupLabel: "Excellent",
      attendanceBreakdown: {
        presentCount: 19,
        lateCount: 0,
        absentCount: 1,
        excusedCount: 0,
        totalFinalized: 20,
      },
      subjectComparison: [{ subject: "Mathematics", average: 88, count: 3 }],
      typeComparison: [{ type: "Exams", average: 88 }],
      recentMarks: [
        { title: "Term Exam", subject: "Mathematics", type: "exam", percentage: 88, grade: "A", date: "2026-11-20" },
      ],
      enrolledClassesCount: 1,
    };

    process.env.GEMINI_API_KEY = "live-mock-key";
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      headline: "Nethmi demonstrates top-tier mastery across Mathematics with 95% attendance.",
                      plusPoints: ["Consistently scores 88%+ on formal timed exams.", "Near-perfect attendance at 95%."],
                      weakPoints: ["One unexcused absence recently noted."],
                      howToImproveOrSustain: ["Introduce challenge Olympiad problem sets weekly."],
                      futureOutlook: {
                        trajectory: "rising",
                        prediction: "Expected to achieve an A distinction comfortably.",
                        targetScoreEstimate: 92,
                      },
                      attendanceInsight: "95% attendance provides strong classroom continuity.",
                      marksInsight: "Steady 88% exam score shows reliable retention.",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const aiResult = await generateTeacherStudentInsights(sampleInput);
    expect(aiResult.source).toBe("gemini");
    expect(aiResult.plusPoints).toContain("Consistently scores 88%+ on formal timed exams.");
    expect(aiResult.futureOutlook.targetScoreEstimate).toBe(92);
  });

  it("computes real student teacher-insights end-to-end from MongoDB marks and attendance", async () => {
    const uniq = `${Date.now()}-adv`;
    const center = await Center.create({ name: `AdvCenter-${uniq}`, timezone: "Asia/Colombo" });
    const teacher = await User.create({
      centerId: center._id,
      username: `teach_${uniq}`,
      passwordHash: "hash",
      name: "Teacher",
      role: "teacher",
      status: "active",
    });
    const student = await User.create({
      centerId: center._id,
      username: `student_adv_${uniq}`,
      passwordHash: "hash",
      name: "Oshada Fernando",
      role: "student",
      status: "active",
    });
    await StudentProfile.create({
      userId: student._id,
      centerId: center._id,
      admissionNo: `ADM-${uniq.slice(-4)}`,
      grade: "Grade 11",
    });

    const subject = await Subject.create({
      centerId: center._id,
      name: "Science",
      code: `SCI-${uniq.slice(-4)}`,
    });
    const cls = await ClassModel.create({
      centerId: center._id,
      name: "Grade 11 Science",
      slug: `sci-${uniq}`,
      subjectId: subject._id,
      teacherId: teacher._id,
      staffIds: [],
      schedule: { type: "regular", regular: { daysOfWeek: [1], startTime: "15:00", endTime: "17:00" } },
      status: "active",
    });
    await Enrollment.create({ classId: cls._id, studentId: student._id, status: "active" });

    const assessment = await Assessment.create({
      centerId: center._id,
      title: "Science Mid Term",
      slug: `sci-mid-${uniq}`,
      type: "exam",
      subjectId: subject._id,
      classIds: [cls._id],
      totalMarks: 100,
      passMark: 40,
      sessions: [{ date: "2026-11-10", startTime: "09:00", endTime: "11:00" }],
      evaluatorIds: [],
      status: "completed",
      createdBy: teacher._id,
    });

    await Mark.create({
      assessmentId: assessment._id,
      studentId: student._id,
      classId: cls._id,
      subjectId: subject._id,
      type: "exam",
      score: 35,
      totalMarks: 100,
      percentage: 35,
      grade: "F",
      attendanceStatus: "present",
      status: "submitted",
      evaluatedAt: new Date("2026-11-11T10:00:00Z"),
    });

    const attSession = await AttendanceSession.create({
      centerId: center._id,
      kind: "class",
      refId: cls._id,
      date: "2026-11-09",
      startTime: "15:00",
      endTime: "17:00",
      status: "finalized",
    });
    await Attendance.create({
      sessionId: attSession._id,
      studentId: student._id,
      classId: cls._id,
      date: "2026-11-09",
      status: "absent",
      source: "manual",
      markedBy: teacher._id,
    });

    const result = await AnalysisService.getStudentTeacherInsights(student.username, {
      forceRefresh: true,
    });

    expect(result.student.name).toBe("Oshada Fernando");
    expect(result.metrics.marksScore).toBe(35);
    expect(result.metrics.attendanceScore).toBe(0);
    expect(result.insights.source).toBe("fallback");
    expect(result.insights.weakPoints.some((w) => w.includes("Science"))).toBe(true);
    expect(result.insights.futureOutlook.trajectory).toBe("at_risk");
  });
});
