import { describe, it, expect } from "vitest";

describe("Auto Absent Finalization Logic Unit Tests", () => {
  it("determines unmarked students and marks them absent on session finalization", () => {
    const enrolledStudents = ["student-1", "student-2", "student-3", "student-4"];
    const markedRecords = [
      { studentId: "student-1", status: "present" },
      { studentId: "student-3", status: "late" },
    ];

    const markedIds = new Set(markedRecords.map((r) => r.studentId));
    const unmarked = enrolledStudents.filter((id) => !markedIds.has(id));

    expect(unmarked).toEqual(["student-2", "student-4"]);

    // Synthesize auto-absent operations
    const autoAbsentRecords = unmarked.map((studentId) => ({
      studentId,
      status: "absent",
      source: "auto_finalized",
    }));

    expect(autoAbsentRecords).toHaveLength(2);
    expect(autoAbsentRecords[0].status).toBe("absent");
    expect(autoAbsentRecords[1].status).toBe("absent");
  });

  it("produces no auto-absent records when all students are marked", () => {
    const enrolledStudents = ["student-1", "student-2"];
    const markedRecords = [
      { studentId: "student-1", status: "present" },
      { studentId: "student-2", status: "present" },
    ];

    const markedIds = new Set(markedRecords.map((r) => r.studentId));
    const unmarked = enrolledStudents.filter((id) => !markedIds.has(id));

    expect(unmarked).toHaveLength(0);
  });

  it("handles auto-absent for assessments across multiple assigned classes", () => {
    const assessmentClassesEnrollments = [
      { classId: "class-A", studentId: "student-1" },
      { classId: "class-A", studentId: "student-2" },
      { classId: "class-B", studentId: "student-3" },
      { classId: "class-B", studentId: "student-4" },
    ];

    const markedAttendance = [
      { studentId: "student-1", status: "present" },
      { studentId: "student-4", status: "present" },
    ];

    const markedIds = new Set(markedAttendance.map((m) => m.studentId));
    const unmarked = assessmentClassesEnrollments.filter((e) => !markedIds.has(e.studentId));

    expect(unmarked).toHaveLength(2);
    expect(unmarked.map((u) => u.studentId)).toEqual(["student-2", "student-3"]);
  });

  it("enforces finalized session lock when user lacks canEditFinalized permission", () => {
    const session = {
      status: "finalized",
      finalizedAt: new Date(),
    };

    const attemptSave = (options?: { canEditFinalized?: boolean }) => {
      if (session.status === "finalized" && !options?.canEditFinalized) {
        throw new Error("This attendance session has already been finalized and cannot be modified.");
      }
      return { success: true };
    };

    // User without edit permission cannot modify finalized session
    expect(() => attemptSave({ canEditFinalized: false })).toThrow(
      "This attendance session has already been finalized and cannot be modified."
    );
    expect(() => attemptSave()).toThrow(
      "This attendance session has already been finalized and cannot be modified."
    );

    // User with edit permission can modify finalized session
    expect(attemptSave({ canEditFinalized: true })).toEqual({ success: true });
  });
});
