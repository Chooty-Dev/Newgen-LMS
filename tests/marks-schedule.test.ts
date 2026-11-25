import { describe, it, expect, beforeAll } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { User } from "@/modules/users/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { AttendanceService } from "@/modules/attendance/service";
import { MarkService } from "@/modules/marks/service";
import { checkAssessmentEvaluationWindow } from "@/modules/marks/evaluation-window";

describe("Marks Evaluation Schedule Service", () => {
  beforeAll(async () => {
    await connectDB();
  });

  it("enforces marks evaluation availability only after the assessment finishes in center timezone", () => {
    const sessions = [{ date: "2026-11-25", startTime: "21:00", endTime: "23:00" }];

    // 12:45 Asia/Colombo (07:15Z) -> Upcoming
    const beforeStart = checkAssessmentEvaluationWindow({
      title: "Evening MCQ Paper",
      sessions,
      status: "scheduled",
      timeZone: "Asia/Colombo",
      now: new Date("2026-11-25T07:15:00Z"),
    });
    expect(beforeStart.hasEnded).toBe(false);
    expect(beforeStart.availability).toBe("upcoming");
    expect(beforeStart.message).toContain("has not started yet");
    expect(beforeStart.message).toContain("23:00");

    // 22:00 Asia/Colombo (16:30Z) -> Ongoing
    const duringExam = checkAssessmentEvaluationWindow({
      title: "Evening MCQ Paper",
      sessions,
      status: "ongoing",
      timeZone: "Asia/Colombo",
      now: new Date("2026-11-25T16:30:00Z"),
    });
    expect(duringExam.hasEnded).toBe(false);
    expect(duringExam.availability).toBe("ongoing");
    expect(duringExam.message).toContain("currently in progress");
    expect(duringExam.message).toContain("23:00");

    // 23:05 Asia/Colombo (17:35Z) -> Ended
    const afterEnd = checkAssessmentEvaluationWindow({
      title: "Evening MCQ Paper",
      sessions,
      status: "scheduled",
      timeZone: "Asia/Colombo",
      now: new Date("2026-11-25T17:35:00Z"),
    });
    expect(afterEnd.hasEnded).toBe(true);
    expect(afterEnd.availability).toBe("ended");
    expect(afterEnd.message).toBeNull();
  });

  it("returns staff member's scheduled assessments, blocks marks before end time, and tracks progress after", async () => {
    const uniq = `${Date.now()}-m`;
    const targetDate = "2026-11-25";

    const center = await Center.create({ name: `MarksCenter-${uniq}`, timezone: "Asia/Colombo" });
    const teacher = await User.create({
      centerId: center._id,
      username: `teach_${uniq}`,
      passwordHash: "hash",
      name: "Teacher One",
      role: "teacher",
      status: "active",
    });
    const staffA = await User.create({
      centerId: center._id,
      username: `staffA_${uniq}`,
      passwordHash: "hash",
      name: "Evaluator A",
      role: "staff",
      status: "active",
    });
    const staffB = await User.create({
      centerId: center._id,
      username: `staffB_${uniq}`,
      passwordHash: "hash",
      name: "Evaluator B",
      role: "staff",
      status: "active",
    });
    const stu1 = await User.create({
      centerId: center._id,
      username: `s1_${uniq}`,
      passwordHash: "hash",
      name: "Stu One",
      role: "student",
      status: "active",
    });
    const stu2 = await User.create({
      centerId: center._id,
      username: `s2_${uniq}`,
      passwordHash: "hash",
      name: "Stu Two",
      role: "student",
      status: "active",
    });

    const subject = await Subject.create({
      centerId: center._id,
      name: "Physics",
      code: `PHY-${uniq.slice(-4)}`,
    });

    const cls = await ClassModel.create({
      centerId: center._id,
      name: "Physics Target Batch",
      slug: `phy-${uniq}`,
      subjectId: subject._id,
      teacherId: teacher._id,
      staffIds: [staffA._id],
      schedule: {
        type: "regular",
        regular: { daysOfWeek: [3], startTime: "15:00", endTime: "17:00" },
      },
      status: "active",
    });

    await Enrollment.insertMany([
      { classId: cls._id, studentId: stu1._id, status: "active" },
      { classId: cls._id, studentId: stu2._id, status: "active" },
    ]);

    const testToday = await Assessment.create({
      centerId: center._id,
      title: "Unit Test 1",
      slug: `ut1-${uniq}`,
      type: "test",
      subjectId: subject._id,
      classIds: [cls._id],
      totalMarks: 50,
      passMark: 20,
      sessions: [{ date: targetDate, startTime: "10:00", endTime: "11:00" }],
      evaluatorIds: [staffA._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    const futureTodayQuiz = await Assessment.create({
      centerId: center._id,
      title: "Late Quiz",
      slug: `lq-${uniq}`,
      type: "mcq_quiz",
      subjectId: subject._id,
      classIds: [cls._id],
      totalMarks: 25,
      passMark: 10,
      sessions: [{ date: targetDate, startTime: "21:00", endTime: "23:00" }],
      evaluatorIds: [staffA._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    await Assessment.create({
      centerId: center._id,
      title: "Other Staff Exam",
      slug: `other-${uniq}`,
      type: "exam",
      subjectId: subject._id,
      classIds: [cls._id],
      totalMarks: 100,
      passMark: 40,
      sessions: [{ date: targetDate, startTime: "13:00", endTime: "15:00" }],
      evaluatorIds: [staffB._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    // At 12:30 Asia/Colombo (07:00Z): Unit Test 1 ended, Late Quiz upcoming
    const midday = new Date("2026-11-25T07:00:00Z");

    const initial = await MarkService.getScheduledEvaluationsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffA._id.toString(),
      now: midday,
    });

    expect(initial.summary.totalScheduled).toBe(2);
    expect(initial.evaluations[0].title).toBe("Unit Test 1");
    expect(initial.evaluations[0].evaluationWindow.hasEnded).toBe(true);
    expect(initial.evaluations[1].title).toBe("Late Quiz");
    expect(initial.evaluations[1].evaluationWindow.hasEnded).toBe(false);
    expect(initial.evaluations[1].evaluationWindow.availability).toBe("upcoming");

    // Blocking marks entry before Late Quiz finishes
    await expect(
      MarkService.evaluateMarks(
        staffA._id.toString(),
        center._id.toString(),
        futureTodayQuiz._id.toString(),
        "draft",
        [{ studentId: stu1._id.toString(), classId: cls._id.toString(), score: 20, attendanceStatus: "present" }],
        { now: midday }
      )
    ).rejects.toThrow("has not started yet");

    // Attendance pre-fill on finished Unit Test 1
    await AttendanceService.saveSessionBatch(
      staffA._id.toString(),
      center._id.toString(),
      {
        kind: "assessment",
        refId: testToday._id.toString(),
        date: targetDate,
        records: [{ studentId: stu1._id.toString(), classId: cls._id.toString(), status: "present" }],
        finalize: true,
      },
      { canEditFinalized: false }
    );

    const grid = await MarkService.getAssessmentForEvaluation(testToday._id.toString(), {
      now: midday,
    });
    const stu2Row = grid.entries.find((e) => e.studentId === stu2._id.toString())!;
    expect(stu2Row.attendanceStatus).toBe("absent");
    expect(grid.assessment.evaluationWindow.hasEnded).toBe(true);

    // Draft -> Completed lifecycle on finished Unit Test 1
    await MarkService.evaluateMarks(
      staffA._id.toString(),
      center._id.toString(),
      testToday._id.toString(),
      "draft",
      [{ studentId: stu1._id.toString(), classId: cls._id.toString(), score: 42, attendanceStatus: "present" }],
      { now: midday }
    );

    const afterDraft = await MarkService.getScheduledEvaluationsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffA._id.toString(),
      now: midday,
    });
    expect(afterDraft.evaluations[0].evaluationStatus).toBe("draft");
    expect(afterDraft.evaluations[0].draftCount).toBe(1);

    await MarkService.evaluateMarks(
      staffA._id.toString(),
      center._id.toString(),
      testToday._id.toString(),
      "submitted",
      [
        { studentId: stu1._id.toString(), classId: cls._id.toString(), score: 42, attendanceStatus: "present" },
        { studentId: stu2._id.toString(), classId: cls._id.toString(), score: 0, attendanceStatus: "absent" },
      ],
      { now: midday }
    );

    const afterSubmit = await MarkService.getScheduledEvaluationsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffA._id.toString(),
      now: midday,
    });
    expect(afterSubmit.evaluations[0].evaluationStatus).toBe("completed");
    expect(afterSubmit.evaluations[0].submittedCount).toBe(2);
    expect(afterSubmit.summary.completedCount).toBe(1);

    // Editing submitted marks without permission must be blocked
    await expect(
      MarkService.evaluateMarks(
        staffA._id.toString(),
        center._id.toString(),
        testToday._id.toString(),
        "submitted",
        [{ studentId: stu1._id.toString(), classId: cls._id.toString(), score: 45, attendanceStatus: "present" }],
        { canEditSubmitted: false, now: midday }
      )
    ).rejects.toThrow("Marks for this assessment have already been finalized and submitted.");

    // Editing submitted marks with marks.update permission succeeds
    await expect(
      MarkService.evaluateMarks(
        staffA._id.toString(),
        center._id.toString(),
        testToday._id.toString(),
        "submitted",
        [{ studentId: stu1._id.toString(), classId: cls._id.toString(), score: 45, attendanceStatus: "present" }],
        { canEditSubmitted: true, now: midday }
      )
    ).resolves.toEqual({ success: true, count: 1 });
  });
});
