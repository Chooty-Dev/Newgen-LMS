import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { User } from "@/modules/users/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { MarkService } from "@/modules/marks/service";
import { StudentTeacherInsight } from "@/modules/analysis/model";
import {
  getStudentTeacherInsights,
  TeacherInsightActionError,
} from "@/modules/analysis/teacher-insights.service";

const originalFetch = globalThis.fetch;

function makeMockGeminiResponse(headline: string) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                headline,
                plusPoints: ["Comes to class on time and tries hard."],
                weakPoints: ["Needs more practice on harder exam questions."],
                howToImproveOrSustain: [
                  "Practice past paper questions twice a week.",
                  "Check wrong answers in class right after each test.",
                ],
                futureOutlook: {
                  trajectory: "rising",
                  targetScoreEstimate: 84,
                  prediction: "The student can score higher with regular weekly practice.",
                },
                attendanceInsight: "Attendance is regular and supports steady learning.",
                marksInsight: "Test scores are good and moving in the right direction.",
              }),
            },
          ],
        },
      },
    ],
  };
}

describe("Teacher Student Insights DB Persistence & 3/24h User+Session+IP Quota", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("auto-saves first view, serves from DB on repeat opens, counts all 3 refresh clicks (including fallbacks), and locks user, session, and IP for 24h", async () => {
    const uniq = `${Date.now()}-q`;
    const baseTime = new Date("2026-11-24T12:00:00Z");

    const center = await Center.create({ name: `InsightCenter-${uniq}`, timezone: "Asia/Colombo" });
    const teacherA = await User.create({
      centerId: center._id,
      username: `teach_a_${uniq}`,
      passwordHash: "hash",
      name: "Teacher A",
      role: "teacher",
      status: "active",
    });
    const teacherB = await User.create({
      centerId: center._id,
      username: `teach_b_${uniq}`,
      passwordHash: "hash",
      name: "Teacher B",
      role: "teacher",
      status: "active",
    });
    const student1 = await User.create({
      centerId: center._id,
      username: `stu1_q_${uniq}`,
      passwordHash: "hash",
      name: "Student One",
      role: "student",
      status: "active",
    });
    const student2 = await User.create({
      centerId: center._id,
      username: `stu2_q_${uniq}`,
      passwordHash: "hash",
      name: "Student Two",
      role: "student",
      status: "active",
    });
    const subject = await Subject.create({
      centerId: center._id,
      name: "Mathematics",
      code: `MTH-${uniq.slice(-4)}`,
    });
    const cls = await ClassModel.create({
      centerId: center._id,
      name: "O/L Maths Batch",
      slug: `ol-math-${uniq}`,
      subjectId: subject._id,
      teacherId: teacherA._id,
      schedule: {
        type: "regular",
        regular: { daysOfWeek: [2], startTime: "15:00", endTime: "17:00" },
      },
      status: "active",
    });
    await Enrollment.insertMany([
      { classId: cls._id, studentId: student1._id, status: "active" },
      { classId: cls._id, studentId: student2._id, status: "active" },
    ]);

    const assess1 = await Assessment.create({
      centerId: center._id,
      title: "Monthly Test 1",
      slug: `mt1-${uniq}`,
      type: "test",
      subjectId: subject._id,
      classIds: [cls._id],
      totalMarks: 50,
      passMark: 20,
      sessions: [{ date: "2026-11-24", startTime: "08:00", endTime: "09:00" }],
      evaluatorIds: [teacherA._id],
      status: "scheduled",
      createdBy: teacherA._id,
    });

    await MarkService.evaluateMarks(
      teacherA._id.toString(),
      center._id.toString(),
      assess1._id.toString(),
      "submitted",
      [
        { studentId: student1._id.toString(), classId: cls._id.toString(), score: 38, attendanceStatus: "present" },
        { studentId: student2._id.toString(), classId: cls._id.toString(), score: 42, attendanceStatus: "present" },
      ],
      { now: baseTime }
    );

    vi.stubEnv("GEMINI_API_KEY", "fake-test-key");
    let fetchCalls = 0;
    let simulateTimeout = false;
    globalThis.fetch = vi.fn(async () => {
      fetchCalls += 1;
      if (simulateTimeout) {
        return new Response("timeout", { status: 503 });
      }
      return new Response(JSON.stringify(makeMockGeminiResponse(`AI Report #${fetchCalls}`)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const ip1 = `203.0.113.${(Date.now() % 200) + 10}`;
    const sessA1 = `sess-a1-${uniq}`;

    // 1. First load auto-generates & saves to DB with 0 quota consumed
    const firstView = await getStudentTeacherInsights(student1.username, {
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: baseTime,
    });
    expect(fetchCalls).toBe(1);
    expect(firstView.insights.source).toBe("gemini");
    expect(firstView.refreshMeta.servedFromCacheDb).toBe(false);
    expect(firstView.refreshMeta.quota).toEqual({
      limit: 3,
      used: 0,
      remaining: 3,
      isLocked: false,
      unlocksAt: null,
    });
    expect(await StudentTeacherInsight.countDocuments({ studentId: student1._id })).toBe(1);

    // 2. Subsequent normal load serves from DB with 0 Gemini calls
    const t2 = new Date(baseTime.getTime() + 5 * 60_000);
    const secondView = await getStudentTeacherInsights(student1.username, {
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: t2,
    });
    expect(fetchCalls).toBe(1);
    expect(secondView.refreshMeta.servedFromCacheDb).toBe(true);
    expect(secondView.refreshMeta.quota.used).toBe(0);

    // 3. Refresh click #1 succeeds & increments used to 1 (next state: Yellow)
    const r1Time = new Date(baseTime.getTime() + 10 * 60_000);
    const refresh1 = await getStudentTeacherInsights(student1.username, {
      forceRefresh: true,
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: r1Time,
    });
    expect(refresh1.refreshMeta.quota).toEqual({
      limit: 3,
      used: 1,
      remaining: 2,
      isLocked: false,
      unlocksAt: null,
    });
    expect(await StudentTeacherInsight.countDocuments({ studentId: student1._id })).toBe(1);

    // 4. Refresh click #2 EVEN when Gemini falls back still increments used to 2 (next state: Red)
    simulateTimeout = true;
    const r2Time = new Date(baseTime.getTime() + 20 * 60_000);
    const refresh2 = await getStudentTeacherInsights(student2.username, {
      forceRefresh: true,
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: r2Time,
    });
    expect(refresh2.insights.source).toBe("fallback");
    expect(refresh2.refreshMeta.quota).toMatchObject({
      used: 2,
      remaining: 1,
      isLocked: false,
    });

    // 5. Refresh click #3 locks quota (used=3, isLocked=true)
    simulateTimeout = false;
    const r3Time = new Date(baseTime.getTime() + 30 * 60_000);
    const refresh3 = await getStudentTeacherInsights(student1.username, {
      forceRefresh: true,
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: r3Time,
    });
    expect(refresh3.refreshMeta.quota.used).toBe(3);
    expect(refresh3.refreshMeta.quota.remaining).toBe(0);
    expect(refresh3.refreshMeta.quota.isLocked).toBe(true);
    expect(refresh3.refreshMeta.quota.unlocksAt).toBe(
      new Date(r1Time.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

    const callsAfter3 = fetchCalls;
    const blockedTime = new Date(baseTime.getTime() + 60 * 60_000);

    // 6a. 4th refresh on same user + session + IP is blocked with 429
    await expect(
      getStudentTeacherInsights(student1.username, {
        forceRefresh: true,
        actorId: teacherA._id.toString(),
        sessionId: sessA1,
        ipAddress: ip1,
        now: blockedTime,
      })
    ).rejects.toMatchObject({
      code: "REFRESH_QUOTA_EXCEEDED",
      statusCode: 429,
    });

    // 6b. Even changing IP & session for same logged-in user (teacherA) is still blocked for 24h
    await expect(
      getStudentTeacherInsights(student1.username, {
        forceRefresh: true,
        actorId: teacherA._id.toString(),
        sessionId: `sess-new-${uniq}`,
        ipAddress: "198.51.100.77",
        now: blockedTime,
      })
    ).rejects.toBeInstanceOf(TeacherInsightActionError);

    // 6c. Even logging in as a DIFFERENT user (teacherB) from the SAME IP (ip1) is blocked for 24h!
    await expect(
      getStudentTeacherInsights(student1.username, {
        forceRefresh: true,
        actorId: teacherB._id.toString(),
        sessionId: `sess-b-${uniq}`,
        ipAddress: ip1,
        now: blockedTime,
      })
    ).rejects.toMatchObject({
      code: "REFRESH_QUOTA_EXCEEDED",
      statusCode: 429,
    });

    // 0 external calls wasted on any blocked attempts
    expect(fetchCalls).toBe(callsAfter3);

    // 7. After 24h + 1 minute past r1Time, oldest slot expires and unlocks cleanly
    const unlockedTime = new Date(r1Time.getTime() + 24 * 60 * 60 * 1000 + 60_000);
    const viewUnlocked = await getStudentTeacherInsights(student1.username, {
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: unlockedTime,
    });
    expect(viewUnlocked.refreshMeta.quota.isLocked).toBe(false);
    expect(viewUnlocked.refreshMeta.quota.used).toBe(2);
    expect(viewUnlocked.refreshMeta.quota.remaining).toBe(1);

    const refreshUnlocked = await getStudentTeacherInsights(student1.username, {
      forceRefresh: true,
      actorId: teacherA._id.toString(),
      sessionId: sessA1,
      ipAddress: ip1,
      now: unlockedTime,
    });
    expect(refreshUnlocked.refreshMeta.quota.used).toBe(3);
    expect(refreshUnlocked.refreshMeta.quota.isLocked).toBe(true);
  });
});
