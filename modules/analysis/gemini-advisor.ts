import { z } from "zod";
import { env } from "@/core/config/env";

export type InsightTrajectory = "rising" | "steady" | "at_risk";

export interface TeacherStudentInsightReport {
  source: "gemini" | "fallback";
  modelUsed?: string;
  fallbackReason?: string;
  generatedAt: string;
  headline: string;
  plusPoints: string[];
  weakPoints: string[];
  howToImproveOrSustain: string[];
  futureOutlook: {
    trajectory: InsightTrajectory;
    prediction: string;
    targetScoreEstimate: number;
  };
  attendanceInsight: string;
  marksInsight: string;
}

export interface StudentInsightInput {
  studentId: string;
  name: string;
  grade: string;
  overallScore: number;
  marksScore: number | null;
  attendanceScore: number | null;
  improvementScore: number;
  group: "weak" | "medium" | "excellent";
  groupLabel: string;
  attendanceBreakdown: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    totalFinalized: number;
  };
  subjectComparison: Array<{ subject: string; average: number; count: number }>;
  typeComparison: Array<{ type: string; average: number }>;
  recentMarks: Array<{
    title: string;
    subject: string;
    type: string;
    percentage: number;
    grade: string;
    date: string;
  }>;
  enrolledClassesCount: number;
}

const GeminiPayloadSchema = z.object({
  headline: z.string().min(8).max(260),
  plusPoints: z.array(z.string().min(4)).min(1).max(5),
  weakPoints: z.array(z.string().min(4)).min(1).max(5),
  howToImproveOrSustain: z.array(z.string().min(4)).min(1).max(5),
  futureOutlook: z.object({
    trajectory: z.enum(["rising", "steady", "at_risk"]),
    prediction: z.string().min(8).max(320),
    targetScoreEstimate: z.number().min(0).max(100),
  }),
  attendanceInsight: z.string().min(6).max(240),
  marksInsight: z.string().min(6).max(240),
});

export function computeStudentInsightFingerprint(input: StudentInsightInput): string {
  return JSON.stringify([
    "v2-simple",
    input.overallScore,
    input.marksScore,
    input.attendanceScore,
    input.improvementScore,
    input.enrolledClassesCount,
    input.attendanceBreakdown.totalFinalized,
    input.attendanceBreakdown.presentCount,
    input.attendanceBreakdown.lateCount,
    input.attendanceBreakdown.absentCount,
    input.attendanceBreakdown.excusedCount,
    input.recentMarks.map((m) => `${m.title}:${m.percentage}:${m.date}`),
  ]);
}

export function isGeminiConfigured(): boolean {
  return Boolean((env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim());
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Deterministic analytics engine guaranteeing complete, teacher-focused student
 * analysis even when Gemini API quota runs out, key is absent, or network fails.
 */
export function buildDeterministicTeacherReport(
  input: StudentInsightInput,
  fallbackReason?: string
): TeacherStudentInsightReport {
  const firstName = input.name.split(" ")[0] || input.name;
  const attTotal = input.attendanceBreakdown.totalFinalized;
  const attScore = input.attendanceScore;
  const marksScore = input.marksScore;
  const sortedSubjects = [...input.subjectComparison].sort((a, b) => b.average - a.average);
  const bestSub = sortedSubjects[0];
  const weakSub = sortedSubjects[sortedSubjects.length - 1];

  const examsEntry = input.typeComparison.find((t) => t.type === "Exams");
  const testsEntry = input.typeComparison.find((t) => t.type === "Tests" || t.type === "Quizzes");

  const recentCount = input.recentMarks.length;
  const recentDelta =
    recentCount >= 4
      ? Math.round(
          (input.recentMarks.slice(-2).reduce((s, m) => s + m.percentage, 0) / 2) -
            (input.recentMarks.slice(0, 2).reduce((s, m) => s + m.percentage, 0) / 2)
        )
      : input.improvementScore - 50;

  const plusPoints: string[] = [];
  const weakPoints: string[] = [];
  const howToImproveOrSustain: string[] = [];

  // 1. Attendance signals (simple, plain English)
  let attendanceInsight = "No class attendance has been marked yet.";
  if (attTotal > 0 && attScore !== null) {
    const { presentCount, lateCount, absentCount } = input.attendanceBreakdown;
    if (attScore >= 88) {
      plusPoints.push(
        `Comes to class regularly (${presentCount} out of ${attTotal} days).`
      );
      attendanceInsight = `Good attendance (${attScore}% across ${attTotal} days). Coming regularly helps keep up with lessons.`;
    } else if (attScore >= 70) {
      plusPoints.push(`Attends most classes (${attScore}% across ${attTotal} days).`);
      if (lateCount >= 2) {
        weakPoints.push(`Came late ${lateCount} times. Being on time helps catch the start of class.`);
      }
      attendanceInsight = `Attended ${attScore}% of classes (${absentCount} absent, ${lateCount} late). Try not to miss or come late.`;
    } else {
      weakPoints.push(
        `Missed too many classes (${absentCount} missed out of ${attTotal} days).`
      );
      howToImproveOrSustain.push(
        `Talk to parents about missing ${absentCount} classes and share missed notes.`
      );
      attendanceInsight = `Low attendance (${absentCount} missed out of ${attTotal} days). Missing classes makes it harder to get good marks.`;
    }
  } else {
    attendanceInsight = "No attendance has been marked yet. Mark upcoming classes to track attendance.";
  }

  // 2. Marks & Subject signals (simple, plain English)
  let marksInsight = "No test or exam marks entered yet.";
  if (marksScore !== null && input.recentMarks.length > 0) {
    if (bestSub && bestSub.average >= 75) {
      plusPoints.push(`Does very well in ${bestSub.subject} (${bestSub.average}% average).`);
    } else if (bestSub && bestSub.average >= 60) {
      plusPoints.push(`Doing steady work in ${bestSub.subject} (${bestSub.average}% average).`);
    }

    if (weakSub && weakSub.average < 55) {
      weakPoints.push(
        `Marks in ${weakSub.subject} are low (${weakSub.average}% average). Needs extra help.`
      );
      howToImproveOrSustain.push(
        `Give simple practice worksheets and check ${weakSub.subject} work every week.`
      );
    } else if (
      sortedSubjects.length > 1 &&
      weakSub &&
      bestSub &&
      bestSub.average - weakSub.average >= 18
    ) {
      weakPoints.push(
        `${weakSub.subject} (${weakSub.average}%) is much lower than ${bestSub.subject} (${bestSub.average}%).`
      );
      howToImproveOrSustain.push(`Spend more study time each week on ${weakSub.subject}.`);
    }

    if (examsEntry && testsEntry) {
      if (testsEntry.average - examsEntry.average >= 15) {
        weakPoints.push(
          `Gets better marks in small tests (${testsEntry.average}%) than in big exams (${examsEntry.average}%).`
        );
        howToImproveOrSustain.push("Give timed practice papers so exams feel easier and less stressful.");
        marksInsight = `Marks average is ${marksScore}%. Daily tests (${testsEntry.average}%) are stronger than big exams (${examsEntry.average}%).`;
      } else if (examsEntry.average >= 75) {
        plusPoints.push(`Gets strong marks in big exams (${examsEntry.average}% average).`);
        marksInsight = `Good marks average of ${marksScore}%, with ${examsEntry.average}% in major exams.`;
      } else {
        marksInsight = `Marks average is ${marksScore}% across ${input.recentMarks.length} tests and exams.`;
      }
    } else {
      marksInsight = `Marks average is ${marksScore}% across ${input.recentMarks.length} graded test(s).`;
    }

    // Recent trajectory delta
    if (recentDelta >= 8 || input.improvementScore >= 60) {
      plusPoints.push(`Marks went up by +${Math.max(recentDelta, 5)}% in recent tests.`);
    } else if (recentDelta <= -8 || input.improvementScore <= 40) {
      weakPoints.push(`Recent test marks dropped compared to earlier scores.`);
      howToImproveOrSustain.push("Go over mistakes from the last two papers together.");
    }
  } else {
    marksInsight = `In ${input.enrolledClassesCount} class(es), waiting for first test marks.`;
    plusPoints.push(`Joined ${input.enrolledClassesCount} active class(es).`);
    weakPoints.push("No test or exam marks recorded yet.");
    howToImproveOrSustain.push("Give a short quiz soon to check how the student is doing.");
  }

  // Ensure clear, balanced bullets
  if (plusPoints.length === 0) {
    plusPoints.push(`Attending ${input.enrolledClassesCount} class(es) and ready to improve with support.`);
  }
  if (weakPoints.length === 0) {
    weakPoints.push(
      input.overallScore >= 85
        ? "Just needs regular revision on full papers to keep top marks."
        : "Small mistakes across tests keep overall marks slightly below 75%."
    );
  }

  if (input.group === "excellent") {
    howToImproveOrSustain.push(
      `Give ${firstName} harder practice questions to keep marks at the top level.`
    );
  } else if (input.group === "medium") {
    howToImproveOrSustain.push(
      "Set a small weekly goal to lift the next test score by 10%."
    );
  } else {
    howToImproveOrSustain.push(
      "Start extra help sessions soon and keep parents updated every week."
    );
  }

  // Trajectory & prediction (simple common English)
  let trajectory: InsightTrajectory = "steady";
  if (input.group === "weak" || recentDelta <= -8 || (attScore !== null && attScore < 65)) {
    trajectory = "at_risk";
  } else if (recentDelta >= 6 || input.improvementScore >= 58 || input.overallScore >= 80) {
    trajectory = "rising";
  }

  const gainProjection = trajectory === "at_risk" ? 12 : trajectory === "rising" ? 6 : 8;
  const targetScoreEstimate = clampScore(Math.max(input.overallScore + gainProjection, input.group === "weak" ? 58 : 78));

  let prediction = "";
  let headline = "";
  if (trajectory === "at_risk") {
    headline = `${firstName} needs extra help right now (${input.overallScore}% overall).`;
    prediction = `If things stay the same, exam marks could stay low. Better attendance and extra work on ${
      weakSub?.subject || "main lessons"
    } can bring marks up to ${targetScoreEstimate}% in a few weeks.`;
  } else if (trajectory === "rising") {
    headline = `${firstName} is doing well and improving (${input.overallScore}% overall).`;
    prediction = `Good work in ${bestSub?.subject || "class"} shows ${firstName} can reach ${targetScoreEstimate}%+ in the next exams by keeping up these study habits.`;
  } else {
    headline = `${firstName} is doing okay at ${input.overallScore}% overall and can improve more.`;
    prediction = `Marks should stay steady around ${input.overallScore}%, and can reach ${targetScoreEstimate}% with more practice on ${
      weakSub?.subject || "weaker parts"
    }.`;
  }

  return {
    source: "fallback",
    fallbackReason,
    generatedAt: new Date().toISOString(),
    headline,
    plusPoints: plusPoints.slice(0, 4),
    weakPoints: weakPoints.slice(0, 4),
    howToImproveOrSustain: howToImproveOrSustain.slice(0, 4),
    futureOutlook: {
      trajectory,
      prediction,
      targetScoreEstimate,
    },
    attendanceInsight,
    marksInsight,
  };
}

/**
 * Generates crisp teacher-oriented student analysis using Gemini AI with automatic
 * failover to the deterministic analytical engine whenever Gemini is unconfigured,
 * quota-limited, timed out, or returns an unexpected response.
 */
export async function generateTeacherStudentInsights(
  input: StudentInsightInput
): Promise<TeacherStudentInsightReport> {
  const apiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  const model = (env.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

  if (!apiKey) {
    return buildDeterministicTeacherReport(input, "api_key_not_configured");
  }

  try {
    const prompt = [
      "You are writing a clear, helpful student report for a teacher or parent.",
      "STRICT LANGUAGE RULE: Write in VERY SIMPLE, everyday common English (Grade 5 reading level).",
      "Use short words and short sentences that anyone can understand immediately.",
      "Do NOT use complex or fancy words (avoid words like: proficiency, mastery, trajectory, continuity, foundational, intervention, systematic, diagnostic, retention, stamina, metrics, equilibrium, optimize, leverage).",
      "Analyze the real student numbers below and return strictly valid JSON (no markdown fences) matching this schema:",
      "{",
      '  "headline": "1 short, simple sentence saying how the student is doing right now",',
      '  "plusPoints": ["3 to 4 very simple bullets (under 14 words each) on what the student is good at"],',
      '  "weakPoints": ["2 to 4 very simple bullets (under 14 words each) on where the student needs help"],',
      '  "howToImproveOrSustain": ["3 to 4 easy, practical steps to help the student improve or keep doing well"],',
      '  "futureOutlook": {',
      '    "trajectory": "rising" | "steady" | "at_risk",',
      '    "prediction": "1 to 2 simple sentences saying how the student will likely do in future exams",',
      '    "targetScoreEstimate": number (0-100)',
      "  },",
      '  "attendanceInsight": "1 short, simple sentence about how often they come to class",',
      '  "marksInsight": "1 short, simple sentence about their test and exam marks"',
      "}",
      "",
      `STUDENT DATA JSON: ${JSON.stringify({
        name: input.name,
        grade: input.grade,
        overallScore: input.overallScore,
        marksScore: input.marksScore,
        attendanceScore: input.attendanceScore,
        improvementScore: input.improvementScore,
        standing: input.groupLabel,
        attendanceBreakdown: input.attendanceBreakdown,
        subjectAverages: input.subjectComparison,
        assessmentTypeAverages: input.typeComparison,
        recentAssessments: input.recentMarks.slice(-8),
        enrolledClassesCount: input.enrolledClassesCount,
      })}`,
    ].join("\n");

    const requestGemini = async (candidateModel: string) => {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: "application/json",
        temperature: 0.35,
        maxOutputTokens: 900,
      };
      if (candidateModel.startsWith("gemini-2.5")) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`gemini_http_${response.status}`);
      }
      return response;
    };

    const candidateModels = Array.from(
      new Set([model, "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"])
    );

    let activeModel = model;
    let response: Response | null = null;
    let lastErr: unknown;

    for (const candidate of candidateModels) {
      try {
        response = await requestGemini(candidate);
        activeModel = candidate;
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : "";
        const retryable =
          msg === "gemini_http_404" ||
          msg === "gemini_http_503" ||
          msg === "gemini_http_502" ||
          (err instanceof Error && err.name === "TimeoutError");
        if (!retryable) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastErr instanceof Error ? lastErr : new Error("gemini_unavailable");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("gemini_empty_response");
    }

    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsedJson = GeminiPayloadSchema.parse(JSON.parse(cleaned));

    const geminiReport: TeacherStudentInsightReport = {
      source: "gemini",
      modelUsed: activeModel,
      generatedAt: new Date().toISOString(),
      headline: parsedJson.headline,
      plusPoints: parsedJson.plusPoints,
      weakPoints: parsedJson.weakPoints,
      howToImproveOrSustain: parsedJson.howToImproveOrSustain,
      futureOutlook: {
        trajectory: parsedJson.futureOutlook.trajectory,
        prediction: parsedJson.futureOutlook.prediction,
        targetScoreEstimate: clampScore(parsedJson.futureOutlook.targetScoreEstimate),
      },
      attendanceInsight: parsedJson.attendanceInsight,
      marksInsight: parsedJson.marksInsight,
    };

    return geminiReport;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "gemini_unavailable";
    console.warn(`[Gemini Advisor Fallback] ${reason}`);
    return buildDeterministicTeacherReport(input, reason);
  }
}
