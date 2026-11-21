export interface MarkItem {
  score: number;
  totalMarks: number;
  percentage: number;
  weight: number;
  date: string | Date;
  subject: string;
  type: string;
}

export interface AttendanceItem {
  date: string | Date;
  status: "present" | "absent" | "late" | "excused";
}

export interface EngineWeights {
  marks: number; // default 0.60
  attendance: number; // default 0.25
  improvement: number; // default 0.15
}

export interface GroupThresholds {
  excellent: number; // default 75
  medium: number; // default 50
}

export type AnalysisGroup = "weak" | "medium" | "excellent";

export interface StudentExplanation {
  summary: string;
  strengths: string[];
  weakPoints: string[];
  reasons: Array<{ text: string; importance: "high" | "medium" | "info" }>;
  recommendations: string[];
}

// 1. Calculate Marks Score (0-100)
export function computeMarksScore(marks: MarkItem[]): number {
  if (marks.length === 0) return 60; // neutral starting baseline

  // Sort by date ascending
  const sorted = [...marks].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalWeightedPercentage = 0;
  let totalWeights = 0;

  sorted.forEach((m, idx) => {
    // Recent marks carry a recency multiplier (from 1.0 to 1.3)
    const recencyMultiplier = 1.0 + (idx / Math.max(1, sorted.length - 1)) * 0.3;
    const effectiveWeight = (m.weight || 1.0) * recencyMultiplier;
    totalWeightedPercentage += m.percentage * effectiveWeight;
    totalWeights += effectiveWeight;
  });

  return Math.min(100, Math.max(0, Math.round(totalWeightedPercentage / totalWeights)));
}

// 2. Calculate Attendance Score (0-100)
export function computeAttendanceScore(records: AttendanceItem[]): number {
  if (records.length === 0) return 75; // neutral baseline

  let points = 0;
  for (const r of records) {
    if (r.status === "present" || r.status === "excused") {
      points += 1.0;
    } else if (r.status === "late") {
      points += 0.5;
    }
    // absent = 0
  }

  const percentage = (points / records.length) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

// 3. Calculate Improvement Score (0-100, 50 is neutral/flat)
export function computeImprovementScore(marks: MarkItem[], windowSize = 6): number {
  if (marks.length < 2) return 50;

  const sorted = [...marks]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-windowSize);

  const n = sorted.length;
  // Linear regression slope of percentages
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += sorted[i].percentage;
    sumXY += i * sorted[i].percentage;
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 50;

  const slope = (n * sumXY - sumX * sumY) / denominator;

  // Map slope: slope of +5 points per test maps to 75; slope of -5 maps to 25
  const score = Math.round(50 + slope * 5);
  return Math.min(100, Math.max(0, score));
}

// 4. Calculate Overall Performance Score (0-100)
export function computeOverallPerformanceScore(
  marksScore: number,
  attendanceScore: number,
  improvementScore: number,
  weights: EngineWeights = { marks: 0.6, attendance: 0.25, improvement: 0.15 }
): number {
  const score =
    marksScore * weights.marks +
    attendanceScore * weights.attendance +
    improvementScore * weights.improvement;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 5. Determine Performance Group
export function determinePerformanceGroup(
  score: number,
  thresholds: GroupThresholds = { excellent: 75, medium: 50 }
): { group: AnalysisGroup; label: string } {
  if (score >= thresholds.excellent) {
    return { group: "excellent", label: "Excellent" };
  }
  if (score >= thresholds.medium) {
    return { group: "medium", label: "Good" };
  }
  return { group: "weak", label: "Needs Help" };
}

// 6. Reasons Engine (plain-language explanation)
export function explainStudent(
  score: number,
  marksScore: number,
  attendanceScore: number,
  improvementScore: number,
  marks: MarkItem[],
  attendance: AttendanceItem[],
  studentName = "This student"
): StudentExplanation {
  const strengths: string[] = [];
  const weakPoints: string[] = [];
  const reasons: Array<{ text: string; importance: "high" | "medium" | "info" }> = [];
  const recommendations: string[] = [];

  // Attendance check
  if (attendanceScore < 70) {
    weakPoints.push(`Came to only ${attendanceScore}% of classes`);
    reasons.push({
      text: `${studentName} has missed multiple scheduled sessions, directly impacting retention.`,
      importance: "high",
    });
    recommendations.push("Talk to the student and guardian about missed classes and attendance.");
  } else if (attendanceScore >= 90) {
    strengths.push("Outstanding attendance consistency (over 90%)");
    reasons.push({
      text: `${studentName} attends almost all scheduled lectures and sessions reliably.`,
      importance: "medium",
    });
  }

  // Subject analysis
  const subjectMap = new Map<string, number[]>();
  marks.forEach((m) => {
    const list = subjectMap.get(m.subject) || [];
    list.push(m.percentage);
    subjectMap.set(m.subject, list);
  });

  let lowestSubj = "";
  let lowestAvg = 100;
  let highestSubj = "";
  let highestAvg = 0;

  for (const [subj, percentages] of subjectMap.entries()) {
    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    if (avg < lowestAvg) {
      lowestAvg = avg;
      lowestSubj = subj;
    }
    if (avg > highestAvg) {
      highestAvg = avg;
      highestSubj = subj;
    }
  }

  if (lowestSubj && lowestAvg < 50) {
    weakPoints.push(`${lowestSubj} marks are the lowest (averaging ${lowestAvg}%)`);
    reasons.push({
      text: `${lowestSubj} requires additional academic focus and revision.`,
      importance: "high",
    });
    recommendations.push(`Assign extra practice papers and revision sessions for ${lowestSubj}.`);
  }

  if (highestSubj && highestAvg >= 75) {
    strengths.push(`Excels in ${highestSubj} with an average of ${highestAvg}%`);
    reasons.push({
      text: `Demonstrates strong mastery and confidence in ${highestSubj}.`,
      importance: "info",
    });
  }

  // Trend / Improvement check
  if (improvementScore >= 60) {
    strengths.push("Marks have steadily improved over recent assessments");
    reasons.push({
      text: `${studentName} shows an upward performance trend in recent papers and tests.`,
      importance: "medium",
    });
    recommendations.push("Acknowledge positive progress to maintain motivation.");
  } else if (improvementScore <= 40) {
    weakPoints.push("Recent assessment scores have been trending downwards");
    reasons.push({
      text: `Performance in the latest assessments dropped compared to earlier tests.`,
      importance: "high",
    });
    recommendations.push("Schedule a one-on-one review to identify topics causing difficulties.");
  }

  // Exam vs Test gap
  const exams = marks.filter((m) => m.type === "exam");
  const tests = marks.filter((m) => m.type !== "exam");
  if (exams.length > 0 && tests.length > 0) {
    const examAvg = Math.round(exams.reduce((s, m) => s + m.percentage, 0) / exams.length);
    const testAvg = Math.round(tests.reduce((s, m) => s + m.percentage, 0) / tests.length);

    if (testAvg - examAvg > 20) {
      weakPoints.push(`Scored ${testAvg}% in regular tests but only ${examAvg}% in exams`);
      reasons.push({
        text: "Large performance gap between casual tests and formal timed examinations.",
        importance: "high",
      });
      recommendations.push("Conduct timed mock exams to reduce exam anxiety and build stamina.");
    } else if (examAvg - testAvg > 15) {
      strengths.push("Performs significantly better under formal examination conditions");
    }
  }

  // Default fallback recommendations if empty
  if (recommendations.length === 0) {
    recommendations.push("Continue with weekly homework and maintain current revision schedule.");
  }

  // Plain language summary
  let summary = "";
  if (score >= 75) {
    summary = `${studentName} is performing exceptionally well with strong mastery across subjects and reliable attendance. Continue regular practice and advanced challenge problems.`;
  } else if (score >= 50) {
    summary = `${studentName} maintains a steady passing standard with good potential. Addressing specific weak areas will help achieve top grades.`;
  } else {
    summary = `${studentName} is currently struggling and needs prompt academic support. Regular class attendance and targeted revision are crucial to get back on track.`;
  }

  return {
    summary,
    strengths,
    weakPoints,
    reasons,
    recommendations,
  };
}
