import { describe, it, expect } from "vitest";
import { calculateScoreFromData } from "@/modules/analysis/engine/score";

describe("Performance Score Engine (computeStudentScore)", () => {
  it("matches the exact worked example from prompt", () => {
    // Maths: Exam 80 (weight 3), Test 70 (weight 2), Assignment 90 (weight 1) gives (240 + 140 + 90) / 6 = 78.3333
    // English: Exam 90 (weight 3), Quiz 100 (weight 1) gives (270 + 100) / 4 = 92.5
    // Science: Test 60 (weight 2) gives 60
    // Marks Score = (78.3333 + 92.5 + 60) / 3 = 76.9444...
    // Attendance: 17 present, 2 late, 1 absent, 1 excused. Counted sessions = 20, points = 17 + 1 = 18, so 90
    // Score = 76.9444... x 0.75 + 90 x 0.25 = 57.7083... + 22.5 = 80.2083..., displayed as 80
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "maths",
          subjectName: "Maths",
          assessments: [
            {
              id: "m1",
              title: "Exam 1",
              type: "exam",
              score: 80,
              totalMarks: 100,
              weight: 3,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "m2",
              title: "Test 1",
              type: "test",
              score: 70,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "m3",
              title: "Assignment 1",
              type: "assignment",
              score: 90,
              totalMarks: 100,
              weight: 1,
              attendanceStatus: "present",
              status: "submitted",
            },
          ],
        },
        {
          subjectId: "english",
          subjectName: "English",
          assessments: [
            {
              id: "e1",
              title: "Exam 1",
              type: "exam",
              score: 90,
              totalMarks: 100,
              weight: 3,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "e2",
              title: "Quiz 1",
              type: "mcq_quiz",
              score: 100,
              totalMarks: 100,
              weight: 1,
              attendanceStatus: "present",
              status: "submitted",
            },
          ],
        },
        {
          subjectId: "science",
          subjectName: "Science",
          assessments: [
            {
              id: "s1",
              title: "Test 1",
              type: "test",
              score: 60,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "present",
              status: "submitted",
            },
          ],
        },
      ],
      attendance: [
        ...Array(17).fill({ status: "present", isFinalized: true }),
        ...Array(2).fill({ status: "late", isFinalized: true }),
        { status: "absent", isFinalized: true },
        { status: "excused", isFinalized: true },
      ],
      weights: { marks: 75, attendance: 25 },
    });

    expect(res.marksScore).toBeCloseTo(76.94, 1);
    expect(res.attendanceScore).toBe(90);
    expect(res.score).toBeCloseTo(80.2, 1);
    expect(res.displayScore).toBe(80);
    expect(res.group).toBe("excellent");
    expect(res.groupLabel).toBe("Great job!");
  });

  it("counts absent as zero when countAbsentAsZero is true", () => {
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "sub1",
          subjectName: "History",
          assessments: [
            {
              id: "h1",
              title: "Test 1",
              type: "test",
              score: 80,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "h2",
              title: "Test 2",
              type: "test",
              score: 0,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "absent",
              status: "submitted",
            },
          ],
        },
      ],
      attendance: [],
      countAbsentAsZero: true,
    });

    // (80*2 + 0*2)/4 = 40
    expect(res.marksScore).toBe(40);
  });

  it("completely ignores excused assessments and excused attendance", () => {
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "sub1",
          subjectName: "History",
          assessments: [
            {
              id: "h1",
              title: "Test 1",
              type: "test",
              score: 80,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "h2",
              title: "Test 2",
              type: "test",
              score: 0,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "excused",
              status: "submitted",
            },
          ],
        },
      ],
      attendance: [
        { status: "present", isFinalized: true },
        { status: "excused", isFinalized: true },
      ],
    });

    // Only Test 1 counted -> 80%
    expect(res.marksScore).toBe(80);
    // Attendance: 1 present, 1 excused -> 1/1 = 100%
    expect(res.attendanceScore).toBe(100);
  });

  it("ignores draft marks and deleted assessments", () => {
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "sub1",
          subjectName: "Maths",
          assessments: [
            {
              id: "m1",
              title: "Exam 1",
              type: "exam",
              score: 90,
              totalMarks: 100,
              weight: 3,
              attendanceStatus: "present",
              status: "submitted",
            },
            {
              id: "m2",
              title: "Draft Test",
              type: "test",
              score: 20,
              totalMarks: 100,
              weight: 2,
              attendanceStatus: "present",
              status: "draft",
            },
            {
              id: "m3",
              title: "Deleted Exam",
              type: "exam",
              score: 10,
              totalMarks: 100,
              weight: 3,
              attendanceStatus: "present",
              status: "submitted",
              deleted: true,
            },
          ],
        },
      ],
      attendance: [],
    });

    expect(res.marksScore).toBe(90);
    expect(res.countedAssessments).toBe(1);
  });

  it("returns null when student has no submitted marks", () => {
    const res = calculateScoreFromData({
      subjects: [],
      attendance: [{ status: "present", isFinalized: true }],
    });

    expect(res.score).toBeNull();
    expect(res.displayScore).toBeNull();
    expect(res.statusText).toBe("Not enough marks yet");
  });

  it("uses marks score only when student has marks but no attendance records", () => {
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "sub1",
          subjectName: "Maths",
          assessments: [
            {
              id: "m1",
              title: "Test 1",
              type: "test",
              score: 85,
              totalMarks: 100,
              attendanceStatus: "present",
              status: "submitted",
            },
          ],
        },
      ],
      attendance: [],
    });

    expect(res.attendanceScore).toBeNull();
    expect(res.marksScore).toBe(85);
    expect(res.score).toBe(85);
    expect(res.displayScore).toBe(85);
  });

  it("normalizes weights if they do not sum to 100", () => {
    const res = calculateScoreFromData({
      subjects: [
        {
          subjectId: "sub1",
          subjectName: "Maths",
          assessments: [
            {
              id: "m1",
              title: "Exam",
              type: "exam",
              score: 100,
              totalMarks: 100,
              attendanceStatus: "present",
              status: "submitted",
            },
          ],
        },
      ],
      attendance: [{ status: "present", isFinalized: true }],
      weights: { marks: 30, attendance: 10 }, // 30:10 -> 75%:25%
    });

    expect(res.weights.marks).toBe(75);
    expect(res.weights.attendance).toBe(25);
    expect(res.displayScore).toBe(100);
  });
});
