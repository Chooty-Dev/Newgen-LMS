import { describe, it, expect, beforeAll } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { User } from "@/modules/users/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { AttendanceService } from "@/modules/attendance/service";
import {
  parseUtcDayOfWeek,
  matchClassScheduleForDate,
  matchAssessmentSessionForDate,
} from "@/modules/attendance/schedule";

describe("Attendance Schedule Domain Helpers & Service", () => {
  beforeAll(async () => {
    await connectDB();
  });

  it("matches regular and special class schedules cleanly in UTC without weekday drift", () => {
    // 2026-11-25 is Wednesday (3)
    expect(parseUtcDayOfWeek("2026-11-25")).toBe(3);

    const wedClass = {
      type: "regular" as const,
      regular: { daysOfWeek: [1, 3], startTime: "15:00", endTime: "17:00" },
    };
    expect(matchClassScheduleForDate(wedClass, "2026-11-25")).toEqual({
      scheduled: true,
      startTime: "15:00",
      endTime: "17:00",
    });
    expect(matchClassScheduleForDate(wedClass, "2026-11-26").scheduled).toBe(false);

    const boundedClass = {
      type: "regular" as const,
      regular: {
        daysOfWeek: [3],
        startTime: "09:00",
        endTime: "11:00",
        startDate: "2026-12-01",
      },
    };
    expect(matchClassScheduleForDate(boundedClass, "2026-11-25").scheduled).toBe(false);
    expect(matchClassScheduleForDate(boundedClass, "2026-12-02").scheduled).toBe(true);

    const specialClass = {
      type: "special" as const,
      special: {
        sessions: [{ date: "2026-11-25", startTime: "08:30", endTime: "12:30" }],
      },
    };
    expect(matchClassScheduleForDate(specialClass, "2026-11-25")).toEqual({
      scheduled: true,
      startTime: "08:30",
      endTime: "12:30",
    });
    expect(matchClassScheduleForDate(specialClass, "2026-11-27").scheduled).toBe(false);
  });

  it("matches assessment session dates cleanly", () => {
    const sessions = [
      { date: "2026-11-25", startTime: "09:00", endTime: "10:30" },
      { date: "2026-11-28", startTime: "14:00", endTime: "15:30" },
    ];
    expect(matchAssessmentSessionForDate(sessions, "2026-11-25")).toEqual({
      scheduled: true,
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(matchAssessmentSessionForDate(sessions, "2026-11-26").scheduled).toBe(false);
  });

  it("returns only the logged-in staff member's assigned classes, tests, exams, and assignments for the chosen date", async () => {
    const uniq = Date.now().toString();
    const targetDate = "2026-11-25"; // Wednesday (dayOfWeek = 3)

    const center = await Center.create({ name: `Center-${uniq}`, timezone: "Asia/Colombo" });
    const teacher = await User.create({
      centerId: center._id,
      username: `teacher_${uniq}`,
      passwordHash: "hash",
      name: "Test Teacher",
      role: "teacher",
      status: "active",
    });
    const staffA = await User.create({
      centerId: center._id,
      username: `staffA_${uniq}`,
      passwordHash: "hash",
      name: "Staff A",
      role: "staff",
      status: "active",
    });
    const staffB = await User.create({
      centerId: center._id,
      username: `staffB_${uniq}`,
      passwordHash: "hash",
      name: "Staff B",
      role: "staff",
      status: "active",
    });
    const student1 = await User.create({
      centerId: center._id,
      username: `stu1_${uniq}`,
      passwordHash: "hash",
      name: "Student One",
      role: "student",
      status: "active",
    });
    const student2 = await User.create({
      centerId: center._id,
      username: `stu2_${uniq}`,
      passwordHash: "hash",
      name: "Student Two",
      role: "student",
      status: "active",
    });

    const subject = await Subject.create({
      centerId: center._id,
      name: "Mathematics",
      code: `M-${uniq.slice(-4)}`,
    });

    // 1. Regular Wednesday class assigned to staffA
    const classWedStaffA = await ClassModel.create({
      centerId: center._id,
      name: "Grade 11 Math Wed",
      slug: `math-wed-${uniq}`,
      subjectId: subject._id,
      teacherId: teacher._id,
      staffIds: [staffA._id],
      schedule: {
        type: "regular",
        regular: { daysOfWeek: [3], startTime: "15:00", endTime: "17:00" },
      },
      status: "active",
    });

    // 2. Tuesday-only class assigned to staffA (should NOT appear on Wednesday)
    await ClassModel.create({
      centerId: center._id,
      name: "Grade 10 Math Tue",
      slug: `math-tue-${uniq}`,
      subjectId: subject._id,
      teacherId: teacher._id,
      staffIds: [staffA._id],
      schedule: {
        type: "regular",
        regular: { daysOfWeek: [2], startTime: "15:00", endTime: "17:00" },
      },
      status: "active",
    });

    // 3. Wednesday class assigned to staffB (should NOT appear for staffA)
    await ClassModel.create({
      centerId: center._id,
      name: "Grade 11 Math StaffB",
      slug: `math-b-${uniq}`,
      subjectId: subject._id,
      teacherId: teacher._id,
      staffIds: [staffB._id],
      schedule: {
        type: "regular",
        regular: { daysOfWeek: [3], startTime: "17:00", endTime: "19:00" },
      },
      status: "active",
    });

    await Enrollment.insertMany([
      { classId: classWedStaffA._id, studentId: student1._id, status: "active" },
      { classId: classWedStaffA._id, studentId: student2._id, status: "active" },
    ]);

    // 4. Exam + Assignment on targetDate assigned to staffA
    const examToday = await Assessment.create({
      centerId: center._id,
      title: "Mid-Term Exam",
      slug: `exam-${uniq}`,
      type: "exam",
      subjectId: subject._id,
      classIds: [classWedStaffA._id],
      totalMarks: 100,
      passMark: 40,
      sessions: [{ date: targetDate, startTime: "09:00", endTime: "11:00" }],
      evaluatorIds: [staffA._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    await Assessment.create({
      centerId: center._id,
      title: "Homework Assignment 1",
      slug: `assign-${uniq}`,
      type: "assignment",
      subjectId: subject._id,
      classIds: [classWedStaffA._id],
      totalMarks: 25,
      passMark: 10,
      sessions: [{ date: targetDate, startTime: "12:00", endTime: "13:00" }],
      evaluatorIds: [staffA._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    // Exam on another date for staffA (should NOT appear on targetDate)
    await Assessment.create({
      centerId: center._id,
      title: "Future Test",
      slug: `future-test-${uniq}`,
      type: "test",
      subjectId: subject._id,
      classIds: [classWedStaffA._id],
      totalMarks: 50,
      passMark: 20,
      sessions: [{ date: "2026-11-29", startTime: "10:00", endTime: "11:00" }],
      evaluatorIds: [staffA._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    // Staff B assessment on targetDate (should NOT appear for staffA)
    await Assessment.create({
      centerId: center._id,
      title: "Staff B Quiz",
      slug: `quiz-b-${uniq}`,
      type: "mcq_quiz",
      subjectId: subject._id,
      classIds: [classWedStaffA._id],
      totalMarks: 20,
      passMark: 8,
      sessions: [{ date: targetDate, startTime: "08:00", endTime: "09:00" }],
      evaluatorIds: [staffB._id],
      status: "scheduled",
      createdBy: teacher._id,
    });

    const staffASchedule = await AttendanceService.getScheduledSessionsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffA._id.toString(),
    });

    expect(staffASchedule.summary.totalScheduled).toBe(3);
    expect(staffASchedule.summary.classesCount).toBe(1);
    expect(staffASchedule.summary.examsCount).toBe(1);
    expect(staffASchedule.summary.assignmentsCount).toBe(1);
    expect(staffASchedule.summary.finalizedCount).toBe(0);

    // Chronological order by startTime: Exam (09:00), Assignment (12:00), Class (15:00)
    expect(staffASchedule.sessions.map((s) => s.title)).toEqual([
      "Mid-Term Exam",
      "Homework Assignment 1",
      "Grade 11 Math Wed",
    ]);
    expect(staffASchedule.sessions[0].expectedCount).toBe(2);
    expect(staffASchedule.sessions[0].sessionStatus).toBe("pending");

    // Save draft then finalize for examToday, verify scheduled card reflects real progress
    await AttendanceService.saveSessionBatch(
      staffA._id.toString(),
      center._id.toString(),
      {
        kind: "assessment",
        refId: examToday._id.toString(),
        date: targetDate,
        records: [{ studentId: student1._id.toString(), classId: classWedStaffA._id.toString(), status: "present" }],
        finalize: true,
      },
      { canEditFinalized: false }
    );

    const refreshed = await AttendanceService.getScheduledSessionsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffA._id.toString(),
    });

    const examCard = refreshed.sessions.find((s) => s.id === examToday._id.toString())!;
    expect(examCard.sessionStatus).toBe("finalized");
    expect(examCard.isFinalized).toBe(true);
    expect(examCard.presentCount).toBe(1);
    expect(examCard.absentCount).toBe(1); // auto-absent on student2
    expect(examCard.markedCount).toBe(2);
    expect(refreshed.summary.finalizedCount).toBe(1);
    expect(refreshed.summary.pendingCount).toBe(2);

    // Confirm staffB only sees Staff B's own 2 items
    const staffBSchedule = await AttendanceService.getScheduledSessionsForDate({
      centerId: center._id.toString(),
      date: targetDate,
      staffId: staffB._id.toString(),
    });
    expect(staffBSchedule.sessions.map((s) => s.title)).toEqual([
      "Staff B Quiz",
      "Grade 11 Math StaffB",
    ]);
  });
});
