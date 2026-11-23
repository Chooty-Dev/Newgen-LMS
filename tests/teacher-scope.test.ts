import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { canAccessStudent } from "@/core/rbac/policies";
import { User } from "@/modules/users/model";
import { Center } from "@/modules/centers/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { SubjectService } from "@/modules/subjects/service";
import { UserService } from "@/modules/users/service";
import { ClassService } from "@/modules/classes/service";

describe("Teacher Scope, Integrity & Details Tests", () => {
  let centerId: mongoose.Types.ObjectId;
  let teacherAId: mongoose.Types.ObjectId;
  let teacherBId: mongoose.Types.ObjectId;
  let studentAId: mongoose.Types.ObjectId;
  let studentBId: mongoose.Types.ObjectId;
  let staffId: mongoose.Types.ObjectId;
  let classAId: mongoose.Types.ObjectId;
  let subjectId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectDB();

    const center = await Center.create({
      name: "Test Center",
      address: "123 Test St",
      phone: "+94 11 000 0000",
      timezone: "Asia/Colombo",
    });
    centerId = center._id;

    const teacherA = await User.create({
      centerId,
      username: "teacher_a_test",
      passwordHash: "hash123",
      name: "Teacher A",
      role: "teacher",
      status: "active",
    });
    teacherAId = teacherA._id;

    const teacherB = await User.create({
      centerId,
      username: "teacher_b_test",
      passwordHash: "hash123",
      name: "Teacher B",
      role: "teacher",
      status: "active",
    });
    teacherBId = teacherB._id;

    const staff = await User.create({
      centerId,
      username: "staff_test",
      passwordHash: "hash123",
      name: "Staff Test",
      role: "staff",
      status: "active",
    });
    staffId = staff._id;

    const studentA = await User.create({
      centerId,
      username: "student_a_test",
      passwordHash: "hash123",
      name: "Student A",
      role: "student",
      status: "active",
    });
    studentAId = studentA._id;

    const studentB = await User.create({
      centerId,
      username: "student_b_test",
      passwordHash: "hash123",
      name: "Student B",
      role: "student",
      status: "active",
    });
    studentBId = studentB._id;

    const subject = await Subject.create({
      centerId,
      name: "Mathematics Test",
      code: "MATH_TEST",
      description: "Test subject",
      status: "active",
    });
    subjectId = subject._id;

    const classA = await ClassModel.create({
      centerId,
      name: "Math Class A",
      slug: generateSlug("Math Class A"),
      subjectId,
      teacherId: teacherAId,
      staffIds: [staffId],
      schedule: { type: "regular", regular: { daysOfWeek: [1], startTime: "10:00", endTime: "12:00" } },
      status: "active",
    });
    classAId = classA._id;

    // Enroll student A in Teacher A's class
    await Enrollment.create({
      classId: classAId,
      studentId: studentAId,
      status: "active",
    });
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ centerId }),
      Center.deleteMany({ _id: centerId }),
      Subject.deleteMany({ centerId }),
      ClassModel.deleteMany({ centerId }),
      Enrollment.deleteMany({ classId: classAId }),
      Assessment.deleteMany({ centerId }),
    ]);
  });

  it("generates deterministic URL-friendly unique slugs", () => {
    const slug1 = generateSlug("Grade 11 Mathematics");
    const slug2 = generateSlug("Grade 11 Mathematics");
    expect(slug1).toContain("grade-11-mathematics");
    expect(slug2).toContain("grade-11-mathematics");
    expect(slug1).not.toBe(slug2); // nanoid suffix ensures uniqueness
  });

  it("enforces canAccessStudent: Teacher A can access Student A, but not Student B", async () => {
    const canAccessA = await canAccessStudent(
      { id: teacherAId.toString(), role: "teacher" },
      studentAId.toString()
    );
    expect(canAccessA).toBe(true);

    const canAccessB = await canAccessStudent(
      { id: teacherAId.toString(), role: "teacher" },
      studentBId.toString()
    );
    expect(canAccessB).toBe(false);

    // Admin has universal access
    const adminAccess = await canAccessStudent(
      { id: new mongoose.Types.ObjectId().toString(), role: "admin" },
      studentBId.toString()
    );
    expect(adminAccess).toBe(true);
  });

  it("blocks deleting a subject if referenced by active class", async () => {
    await expect(
      SubjectService.deleteSubject(subjectId.toString(), teacherAId.toString())
    ).rejects.toThrow(/Cannot delete subject/);
  });

  it("blocks deleting a staff member if assigned as evaluator on active assessment with pending marks", async () => {
    const asm = await Assessment.create({
      centerId,
      title: "Active Evaluation Test",
      slug: generateSlug("Active Evaluation Test"),
      type: "exam",
      subjectId,
      classIds: [classAId],
      totalMarks: 100,
      passMark: 40,
      weight: 1,
      evaluatorIds: [staffId],
      status: "waiting_marks",
      createdBy: teacherAId,
    });

    await expect(
      UserService.softDeleteUser({ id: teacherAId.toString(), role: "teacher" }, staffId.toString())
    ).rejects.toThrow(/Cannot delete staff member/);

    // Clean up assessment
    await Assessment.deleteOne({ _id: asm._id });
  });

  it("cascades active student enrollments to 'left' when class is deleted", async () => {
    await ClassService.deleteClass(classAId.toString(), teacherAId.toString());

    const enrollment = await Enrollment.findOne({ classId: classAId, studentId: studentAId });
    expect(enrollment?.status).toBe("left");
    expect(enrollment?.leftAt).toBeDefined();
  });

  it("creates a student with immediate class enrollment and verifies teacher access", async () => {
    const classB = await ClassModel.create({
      centerId,
      name: "Chemistry Class B",
      slug: generateSlug("Chemistry Class B"),
      subjectId,
      teacherId: teacherAId,
      schedule: { type: "regular", regular: { daysOfWeek: [2], startTime: "14:00", endTime: "16:00" } },
      status: "active",
    });

    const { user: newStudent } = await UserService.createUser(
      { id: teacherAId.toString(), role: "teacher", centerId: centerId.toString() },
      {
        name: "Enrolled Student Test",
        username: "enrolled_test_student",
        role: "student",
        grade: "Grade 11",
        classId: classB._id.toString(),
      }
    );

    const enrollment = await Enrollment.findOne({ classId: classB._id, studentId: newStudent._id });
    expect(enrollment).toBeDefined();
    expect(enrollment?.status).toBe("active");

    // Verify teacher A has access because enrolled in teacher's class
    const canAccess = await canAccessStudent(
      { id: teacherAId.toString(), role: "teacher" },
      newStudent._id.toString()
    );
    expect(canAccess).toBe(true);
  });

  it("creates staff with delegated student permissions and resolves effective permissions", async () => {
    const { user: newStaff } = await UserService.createUser(
      { id: teacherAId.toString(), role: "teacher", centerId: centerId.toString() },
      {
        name: "Staff with Permissions",
        username: "staff_with_perms_test",
        role: "staff",
        permissions: ["students.create", "students.view", "students.update", "students.delete"],
      }
    );

    const staffDetails = await UserService.getStaffDetails(newStaff._id.toString());
    expect(staffDetails.permissions).toContain("students.create");
    expect(staffDetails.permissions).toContain("students.view");
    expect(staffDetails.permissions).toContain("students.update");
    expect(staffDetails.permissions).toContain("students.delete");
  });

  it("validates listQuerySchema with limit=250 and handles 'all' filter parameters safely", async () => {
    const { listQuerySchema } = await import("@/modules/users/schema");
    const parsed = listQuerySchema.parse({ limit: "250", status: "all", classId: "all", group: "all" });
    expect(parsed.limit).toBe(250);

    const studentsResult = await UserService.listStudents({
      centerId: centerId.toString(),
      page: 1,
      limit: 250,
      status: "all",
      classId: "all",
      group: "all",
      teacherId: teacherAId.toString(),
      teacherClassesOnly: [classAId.toString()],
    });
    expect(studentsResult.data).toBeDefined();
    expect(Array.isArray(studentsResult.data)).toBe(true);

    const { MarkService } = await import("@/modules/marks/service");
    const marksResult = await MarkService.listMarks({
      studentId: "all",
      classId: "all",
      subjectId: "all",
      status: "all",
    });
    expect(marksResult.data).toBeDefined();

    const { AssessmentService } = await import("@/modules/exams/service");
    const examsResult = await AssessmentService.listAssessments({
      centerId: centerId.toString(),
      teacherId: teacherAId.toString(),
      subjectId: "all",
      status: "all",
      type: "all",
    });
    expect(examsResult.data).toBeDefined();
  });
});
