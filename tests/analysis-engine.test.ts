import { describe, it, expect } from "vitest";
import {
  computeMarksScore,
  computeAttendanceScore,
  computeImprovementScore,
  computeOverallPerformanceScore,
  determinePerformanceGroup,
  explainStudent,
  MarkItem,
  AttendanceItem,
} from "../modules/analysis/engine";

describe("Analysis Engine Unit Tests", () => {
  it("computes baseline marks score when empty", () => {
    const score = computeMarksScore([]);
    expect(score).toBe(60);
  });

  it("computes weighted marks score with recency weighting", () => {
    const marks: MarkItem[] = [
      {
        score: 60,
        totalMarks: 100,
        percentage: 60,
        weight: 1,
        date: "2026-01-01",
        subject: "Math",
        type: "test",
      },
      {
        score: 90,
        totalMarks: 100,
        percentage: 90,
        weight: 1,
        date: "2026-02-01",
        subject: "Math",
        type: "test",
      },
    ];
    const score = computeMarksScore(marks);
    // Recent 90 carries 1.3 weight vs older 60 carrying 1.0 weight -> average > 75
    expect(score).toBeGreaterThan(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("computes attendance score accurately", () => {
    const records: AttendanceItem[] = [
      { date: "2026-01-01", status: "present" },
      { date: "2026-01-02", status: "present" },
      { date: "2026-01-03", status: "late" }, // 0.5 points
      { date: "2026-01-04", status: "absent" }, // 0 points
    ];
    // Points = 1 + 1 + 0.5 + 0 = 2.5 / 4 = 62.5% -> round to 63%
    const score = computeAttendanceScore(records);
    expect(score).toBe(63);
  });

  it("computes improvement score slope accurately", () => {
    // Strongly improving trajectory
    const improvingMarks: MarkItem[] = [
      { score: 50, totalMarks: 100, percentage: 50, weight: 1, date: "2026-01-01", subject: "Math", type: "test" },
      { score: 60, totalMarks: 100, percentage: 60, weight: 1, date: "2026-01-08", subject: "Math", type: "test" },
      { score: 70, totalMarks: 100, percentage: 70, weight: 1, date: "2026-01-15", subject: "Math", type: "test" },
      { score: 80, totalMarks: 100, percentage: 80, weight: 1, date: "2026-01-22", subject: "Math", type: "test" },
    ];
    const impScore = computeImprovementScore(improvingMarks);
    expect(impScore).toBeGreaterThan(75);

    // Declining trajectory
    const decliningMarks: MarkItem[] = [
      { score: 80, totalMarks: 100, percentage: 80, weight: 1, date: "2026-01-01", subject: "Math", type: "test" },
      { score: 70, totalMarks: 100, percentage: 70, weight: 1, date: "2026-01-08", subject: "Math", type: "test" },
      { score: 60, totalMarks: 100, percentage: 60, weight: 1, date: "2026-01-15", subject: "Math", type: "test" },
      { score: 40, totalMarks: 100, percentage: 40, weight: 1, date: "2026-01-22", subject: "Math", type: "test" },
    ];
    const decScore = computeImprovementScore(decliningMarks);
    expect(decScore).toBeLessThan(35);
  });

  it("calculates overall performance score with custom weights", () => {
    // marks: 80 (weight 0.6), attendance: 90 (weight 0.25), improvement: 60 (weight 0.15)
    // 80*0.6 = 48, 90*0.25 = 22.5, 60*0.15 = 9. Total = 79.5 -> 80
    const overall = computeOverallPerformanceScore(80, 90, 60, {
      marks: 0.6,
      attendance: 0.25,
      improvement: 0.15,
    });
    expect(overall).toBe(80);
  });

  it("determines performance group correctly according to thresholds", () => {
    const excellent = determinePerformanceGroup(85, { excellent: 75, medium: 50 });
    expect(excellent.group).toBe("excellent");
    expect(excellent.label).toBe("Excellent");

    const medium = determinePerformanceGroup(65, { excellent: 75, medium: 50 });
    expect(medium.group).toBe("medium");
    expect(medium.label).toBe("Good");

    const weak = determinePerformanceGroup(42, { excellent: 75, medium: 50 });
    expect(weak.group).toBe("weak");
    expect(weak.label).toBe("Needs Help");
  });

  it("generates plain-language explanation with reasons, strengths, and recommendations", () => {
    const marks: MarkItem[] = [
      { score: 90, totalMarks: 100, percentage: 90, weight: 1, date: "2026-01-01", subject: "Math", type: "test" },
      { score: 40, totalMarks: 100, percentage: 40, weight: 1, date: "2026-01-05", subject: "Science", type: "test" },
    ];
    const attendance: AttendanceItem[] = [
      { date: "2026-01-01", status: "present" },
      { date: "2026-01-02", status: "absent" },
    ];

    const explanation = explainStudent(65, 65, 50, 50, marks, attendance, "Kasun");
    expect(explanation.summary).toBeDefined();
    expect(explanation.strengths.length).toBeGreaterThan(0);
    expect(explanation.weakPoints.length).toBeGreaterThan(0);
    expect(explanation.recommendations.length).toBeGreaterThan(0);
  });
});
