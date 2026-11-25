import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { User } from "@/modules/users/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { ClassService } from "@/modules/classes/service";
import { AssessmentService } from "@/modules/exams/service";
import {
  filterAssessmentsForClasses,
  getCachedStaffAssignmentOptions,
  invalidateStaffAssignmentOptionsCache,
} from "@/modules/users/staff-assignment-cache";

describe("Staff Assignment Options Cache & Class Filtering", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    invalidateStaffAssignmentOptionsCache();
  });

  it("caches class and assessment assignment options with 0 DB calls on repeat hits, invalidates on mutations, and filters assessments by selected class", async () => {
    const uniq = `${Date.now()}-sc`;
    const center = await Center.create({ name: `StaffAssignCenter-${uniq}`, timezone: "Asia/Colombo" });
    const teacher = await User.create({
      centerId: center._id,
      username: `teach_sa_${uniq}`,
      passwordHash: "hash",
      name: "Teacher StaffAssign",
      role: "teacher",
      status: "active",
    });

    const mathSub = await Subject.create({
      centerId: center._id,
      name: "Mathematics",
      code: `M-${uniq.slice(-4)}`,
    });
    const phySub = await Subject.create({
      centerId: center._id,
      name: "Physics",
      code: `P-${uniq.slice(-4)}`,
    });

    const mathClass = await ClassService.createClass(center._id.toString(), {
      name: "Math Batch",
      subjectId: mathSub._id.toString(),
      teacherId: teacher._id.toString(),
      scheduleType: "regular",
      daysOfWeek: [1],
      startTime: "14:00",
      endTime: "16:00",
    });
    const phyClass = await ClassService.createClass(center._id.toString(), {
      name: "Physics Batch",
      subjectId: phySub._id.toString(),
      teacherId: teacher._id.toString(),
      scheduleType: "regular",
      daysOfWeek: [3],
      startTime: "14:00",
      endTime: "16:00",
    });

    const mathTest = await AssessmentService.createAssessment(center._id.toString(), teacher._id.toString(), {
      title: "Math Quiz 1",
      type: "mcq_quiz",
      subjectId: mathSub._id.toString(),
      classIds: [mathClass._id.toString()],
      totalMarks: 25,
      passMark: 10,
      weight: 1,
      dateMode: "single",
      sessions: [{ date: "2026-11-26", startTime: "09:00", endTime: "10:00" }],
      evaluatorIds: [],
    });

    const phyExam = await AssessmentService.createAssessment(center._id.toString(), teacher._id.toString(), {
      title: "Physics Final",
      type: "exam",
      subjectId: phySub._id.toString(),
      classIds: [phyClass._id.toString()],
      totalMarks: 100,
      passMark: 40,
      weight: 1,
      dateMode: "single",
      sessions: [{ date: "2026-11-27", startTime: "09:00", endTime: "11:00" }],
      evaluatorIds: [],
    });

    await AssessmentService.createAssessment(center._id.toString(), teacher._id.toString(), {
      title: "Combined Mock Paper",
      type: "paper",
      subjectId: mathSub._id.toString(),
      classIds: [mathClass._id.toString(), phyClass._id.toString()],
      totalMarks: 100,
      passMark: 40,
      weight: 1,
      dateMode: "single",
      sessions: [{ date: "2026-11-28", startTime: "09:00", endTime: "11:00" }],
      evaluatorIds: [],
    });

    const t0 = 1_700_000_000_000;

    // 1. Cold load hits DB once
    const first = await getCachedStaffAssignmentOptions({
      centerId: center._id.toString(),
      teacherId: teacher._id.toString(),
      nowMs: t0,
    });
    expect(first.cacheHit).toBe(false);
    expect(first.data.classes.map((c) => c.name)).toEqual(["Math Batch", "Physics Batch"]);
    expect(first.data.assessments).toHaveLength(3);

    // Filtering returns nothing when no class selected, and strictly matching ones when selected
    expect(filterAssessmentsForClasses(first.data.assessments, [])).toEqual([]);
    const mathOnly = filterAssessmentsForClasses(first.data.assessments, [mathClass._id.toString()]);
    expect(mathOnly.map((a) => a.title).sort()).toEqual(["Combined Mock Paper", "Math Quiz 1"]);
    expect(mathOnly.some((a) => a.id === phyExam._id.toString())).toBe(false);

    const phyOnly = filterAssessmentsForClasses(first.data.assessments, [phyClass._id.toString()]);
    expect(phyOnly.map((a) => a.title).sort()).toEqual(["Combined Mock Paper", "Physics Final"]);
    expect(phyOnly.some((a) => a.id === mathTest._id.toString())).toBe(false);

    // 2. Warm load within TTL hits memory cache with ZERO MongoDB calls
    const classFindSpy = vi.spyOn(ClassModel, "find");
    const assessmentFindSpy = vi.spyOn(Assessment, "find");

    const second = await getCachedStaffAssignmentOptions({
      centerId: center._id.toString(),
      teacherId: teacher._id.toString(),
      nowMs: t0 + 30_000,
    });
    expect(second.cacheHit).toBe(true);
    expect(classFindSpy).not.toHaveBeenCalled();
    expect(assessmentFindSpy).not.toHaveBeenCalled();

    classFindSpy.mockRestore();
    assessmentFindSpy.mockRestore();

    // 3. Creating a new assessment invalidates the cache so the next load refreshes cleanly
    await AssessmentService.createAssessment(center._id.toString(), teacher._id.toString(), {
      title: "Math Algebra Test 2",
      type: "test",
      subjectId: mathSub._id.toString(),
      classIds: [mathClass._id.toString()],
      totalMarks: 50,
      passMark: 20,
      weight: 1,
      dateMode: "single",
      sessions: [{ date: "2026-11-29", startTime: "10:00", endTime: "11:00" }],
      evaluatorIds: [],
    });

    const third = await getCachedStaffAssignmentOptions({
      centerId: center._id.toString(),
      teacherId: teacher._id.toString(),
      nowMs: t0 + 35_000,
    });
    expect(third.cacheHit).toBe(false);
    const updatedMathOnly = filterAssessmentsForClasses(third.data.assessments, [mathClass._id.toString()]);
    expect(updatedMathOnly.map((a) => a.title)).toContain("Math Algebra Test 2");
  });
});
