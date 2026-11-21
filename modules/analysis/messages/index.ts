export interface MessageContext {
  studentId: string;
  name: string;
  score: number | null;
  displayScore: number | null;
  scoreDiff30d?: number;
  attendanceScore: number | null;
  bestSubject?: string;
  focusSubject?: string;
  weakSubject?: string; // legacy alias for focusSubject
  streak?: number;
  rank?: number | null; // 1-10 or null
  distanceToTop10?: number | null; // e.g. 4 points
  perfectAttendance?: boolean;
  isNewStudent?: boolean;
}

export interface MessageRule {
  id: string;
  priority: number;
  condition: (ctx: MessageContext) => boolean;
  messageVariants: string[];
  tipVariants: string[];
}

export const BANNED_WORDS = [
  "failing",
  "bad",
  "weak",
  "poor",
  "at risk",
  "lazy",
  "failing standard",
  "dumb",
  "worst",
];

/**
 * Deterministic pseudo-random integer in [0, max - 1] based on seed string.
 */
function seededIndex(seed: string, max: number): number {
  if (max <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

function interpolate(template: string, ctx: MessageContext): string {
  const pointsTo90 = ctx.displayScore !== null ? Math.max(1, 90 - ctx.displayScore) : 10;
  const bestSub = ctx.bestSubject || "your favorite subject";
  const focusSub = ctx.focusSubject || ctx.weakSubject || "your revision topics";
  const pointsChange = Math.abs(ctx.scoreDiff30d ?? 0);
  const streakDays = ctx.streak || 3;
  const nextStreak = streakDays + 2;
  const distTop10 = ctx.distanceToTop10 ?? 5;

  return template
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{score\}/g, ctx.displayScore !== null ? `${ctx.displayScore}` : "new")
    .replace(/\{bestSubject\}/g, bestSub)
    .replace(/\{focusSubject\}/g, focusSub)
    .replace(/\{weakSubject\}/g, focusSub)
    .replace(/\{points\}/g, `${pointsChange || distTop10 || pointsTo90}`)
    .replace(/\{days\}/g, `${streakDays}`)
    .replace(/\{nextStreak\}/g, `${nextStreak}`)
    .replace(/\{rank\}/g, ctx.rank ? `${ctx.rank}` : "Top 10");
}

export const MESSAGE_RULES: MessageRule[] = [
  // 1. #1 in LMS
  {
    id: "rank_1",
    priority: 100,
    condition: (ctx) => ctx.rank === 1,
    messageVariants: [
      "You are #1 in LMS! Great job, {name}.",
      "Incredible achievement, {name}! You hold the #1 rank in LMS.",
      "Champion learner! You are ranked #1 in LMS today, {name}.",
    ],
    tipVariants: [
      "Be a role model. Help a friend with their studies today.",
      "Challenge yourself with an advanced puzzle or problem in {bestSubject}.",
      "Keep your streak going and enjoy learning something new.",
    ],
  },

  // 2. In Top 10 (2-10)
  {
    id: "in_top_10",
    priority: 95,
    condition: (ctx) => typeof ctx.rank === "number" && ctx.rank >= 2 && ctx.rank <= 10,
    messageVariants: [
      "You are #{rank} in LMS! That is truly remarkable, {name}.",
      "Superb work, {name}! You have earned #{rank} in LMS.",
      "You are shining brightly at #{rank} in LMS!",
    ],
    tipVariants: [
      "Keep going to stay strong in the Top 10.",
      "Spend 15 minutes reviewing {focusSubject} to push for the top 3.",
      "Share your revision tips with your classmates.",
    ],
  },

  // 3. New student
  {
    id: "new_student",
    priority: 90,
    condition: (ctx) => ctx.isNewStudent === true || ctx.score === null,
    messageVariants: [
      "Welcome, {name}! Your score will show after your first marks.",
      "Welcome, {name}! Step into class and get ready for an exciting journey.",
      "Welcome, {name}! Your progress will unfold with each test.",
    ],
    tipVariants: [
      "Come to class and do your first test with confidence.",
      "Ask your teacher any questions you have about upcoming lessons.",
      "Explore your subjects and get comfortable with your schedule.",
    ],
  },

  // 4. Score below 50 (High priority for encouragement)
  {
    id: "score_below_50",
    priority: 85,
    condition: (ctx) => (ctx.displayScore !== null && ctx.displayScore < 50),
    messageVariants: [
      "Let's grow together, {name}. You can do this.",
      "You are not alone on this journey, {name}. We are here to support you.",
      "Small steps every single day lead to wonderful turnarounds, {name}.",
    ],
    tipVariants: [
      "Start with {focusSubject}, just 10 minutes today.",
      "Ask a teacher for help. It is a good thing to do.",
      "Be present in your next class and listen carefully to the main idea.",
    ],
  },

  // 5. Close to Top 10
  {
    id: "close_to_top_10",
    priority: 80,
    condition: (ctx) => (ctx.rank === null || ctx.rank === undefined || ctx.rank > 10) && typeof ctx.distanceToTop10 === "number" && ctx.distanceToTop10 <= 5,
    messageVariants: [
      "You are only {points} points from the Top 10, {name}!",
      "So close to the Top 10 leaderboard, {name}! You can do it.",
      "The Top 10 is just within your reach, {name}. Keep pushing!",
    ],
    tipVariants: [
      "One more good test can lift you straight into the Top 10.",
      "Focus 20 minutes on {focusSubject} practice today.",
      "Never miss a scheduled class to secure your attendance points.",
    ],
  },

  // 6. Perfect attendance this month
  {
    id: "perfect_attendance",
    priority: 75,
    condition: (ctx) => ctx.perfectAttendance === true,
    messageVariants: [
      "You never missed a class this month, {name}!",
      "Perfect attendance this month! Your consistency is outstanding.",
      "100% presence in class this month, {name}! You are setting a wonderful example.",
    ],
    tipVariants: [
      "Amazing habit. Keep it up through next month.",
      "Your presence in class gives you a huge advantage.",
      "Celebrate your consistency and stay curious in lessons.",
    ],
  },

  // 7. Attendance streak 5+ days
  {
    id: "streak_high",
    priority: 70,
    condition: (ctx) => (ctx.streak ?? 0) >= 5,
    messageVariants: [
      "{days} days in a row! You are on a roll, {name}.",
      "What a streak! {days} days of dedicated learning in a row.",
      "Unstoppable! You have attended {days} learning sessions consecutively.",
    ],
    tipVariants: [
      "Can you reach {nextStreak} consecutive sessions?",
      "Daily learning makes difficult topics feel simple.",
      "Keep this wonderful momentum alive all week.",
    ],
  },

  // 8. Score going up (5+ points in 30 days)
  {
    id: "trending_up",
    priority: 65,
    condition: (ctx) => (ctx.scoreDiff30d ?? 0) >= 5,
    messageVariants: [
      "Your score went up {points} points. Well done, {name}!",
      "Wonderful climb! You improved by {points} points recently.",
      "Your hard work is paying off with a {points}-point rise!",
    ],
    tipVariants: [
      "Keep doing what you are doing. It works!",
      "Take pride in your upward progress.",
      "Review what helped you improve and stick with that routine.",
    ],
  },

  // 9. Score going down (5+ points in 30 days)
  {
    id: "trending_down",
    priority: 60,
    condition: (ctx) => (ctx.scoreDiff30d ?? 0) <= -5,
    messageVariants: [
      "Your score dipped a little. That is okay, {name}!",
      "Every climb has small dips. You can bounce right back, {name}.",
      "Learning takes time. A fresh start this week will make all the difference.",
    ],
    tipVariants: [
      "Look at your last test and try those questions again.",
      "Spend just 10 minutes on {focusSubject} revision today.",
      "Ask your teacher for clarification before the next paper.",
    ],
  },

  // 10. Attendance below 80%
  {
    id: "attendance_low",
    priority: 55,
    condition: (ctx) => (ctx.attendanceScore !== null && ctx.attendanceScore < 80),
    messageVariants: [
      "Coming to class gives you valuable points, {name}.",
      "Let's boost your presence in class, {name}!",
      "Every class attended lifts your score and keeps you on track.",
    ],
    tipVariants: [
      "Try to come to every class this week.",
      "Set a reminder for your upcoming session time.",
      "Attending class regularly turns good marks into great marks.",
    ],
  },

  // 11. Score 90 and above
  {
    id: "score_90_plus",
    priority: 50,
    condition: (ctx) => (ctx.displayScore ?? 0) >= 90,
    messageVariants: [
      "Wow, {name}! You are a star. Your score is {score}.",
      "Brilliant mastery, {name}! You are excelling with a score of {score}.",
      "Top-tier performance, {name}! You are leading with confidence.",
    ],
    tipVariants: [
      "Help a friend with {bestSubject} practice.",
      "Try harder questions in {bestSubject} to stretch your mind.",
      "Keep your streak going and enjoy your accomplishments.",
    ],
  },

  // 12. Score 75 to 89
  {
    id: "score_75_89",
    priority: 45,
    condition: (ctx) => (ctx.displayScore ?? 0) >= 75 && (ctx.displayScore ?? 0) < 90,
    messageVariants: [
      "Great work, {name}! You are doing really well.",
      "Impressive progress, {name}! You have a solid grasp on your subjects.",
      "You are in great shape, {name}. Keep building your confidence.",
    ],
    tipVariants: [
      "You are close to 90. Practise {focusSubject} for 15 minutes a day.",
      "Review your recent feedback to polish any small mistakes.",
      "Keep your class attendance high to secure your standing.",
    ],
  },

  // 13. Score 60 to 74
  {
    id: "score_60_74",
    priority: 40,
    condition: (ctx) => (ctx.displayScore ?? 0) >= 60 && (ctx.displayScore ?? 0) < 75,
    messageVariants: [
      "Good job, {name}! You are on a good path.",
      "Steady effort, {name}! You are building strong understanding step by step.",
      "Keep going, {name}! With steady practice your score will climb higher.",
    ],
    tipVariants: [
      "Pick one subject this week to focus on: {focusSubject}.",
      "Do not miss any class this week to keep points moving up.",
      "Review your class notes 10 minutes every evening.",
    ],
  },

  // 14. Score 50 to 59
  {
    id: "score_50_59",
    priority: 35,
    condition: (ctx) => (ctx.displayScore ?? 0) >= 50 && (ctx.displayScore ?? 0) < 60,
    messageVariants: [
      "You are getting there, {name}. Small steps help.",
      "Every day is a fresh opportunity to grow, {name}.",
      "You have solid potential, {name}. A little focus will show big results.",
    ],
    tipVariants: [
      "Ask your teacher about {focusSubject} during the next class.",
      "Come to every class to gain easy attendance points.",
      "Practise 5 simple questions in {focusSubject} today.",
    ],
  },
];

export function generateStudentMessages(
  ctx: MessageContext,
  dateStr?: string
): {
  friendlyMessage: string;
  focusTip: string;
  tips: string[];
} {
  const effectiveDate = dateStr || new Date().toISOString().slice(0, 10);
  const seedBase = `${ctx.studentId}_${effectiveDate}`;

  // Find matching rules sorted by priority descending
  const matchedRules = MESSAGE_RULES
    .filter((r) => r.condition(ctx))
    .sort((a, b) => b.priority - a.priority);

  // Fallback rule if none match
  const primaryRule = matchedRules[0] || MESSAGE_RULES.find((r) => r.id === "score_60_74")!;

  // Pick main message deterministically using seed
  const msgIdx = seededIndex(`${seedBase}_msg`, primaryRule.messageVariants.length);
  const friendlyMessage = interpolate(primaryRule.messageVariants[msgIdx], ctx);

  // Collect and pick up to 3 tips from top rules
  const allTips: string[] = [];
  matchedRules.slice(0, 3).forEach((rule, rIdx) => {
    const tipIdx = seededIndex(`${seedBase}_tip_${rIdx}`, rule.tipVariants.length);
    allTips.push(interpolate(rule.tipVariants[tipIdx], ctx));
  });

  // Ensure at least 1 tip
  if (allTips.length === 0) {
    allTips.push("Keep attending classes and revising regularly.");
  }

  // Focus tip is the primary tip
  const focusTip = allTips[0];

  return {
    friendlyMessage,
    focusTip,
    tips: allTips.slice(0, 3),
  };
}
