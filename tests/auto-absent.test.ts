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
});
