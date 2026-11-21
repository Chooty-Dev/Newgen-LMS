import { describe, it, expect } from "vitest";
import {
  generateStudentMessages,
  MESSAGE_RULES,
  BANNED_WORDS,
  MessageContext,
} from "@/modules/analysis/messages";

describe("Smart Tips & Message Engine", () => {
  it("never contains any banned words in any variant or output", () => {
    const dummyCtx: MessageContext = {
      studentId: "s1",
      name: "Student",
      score: 75,
      displayScore: 75,
      attendanceScore: 85,
      bestSubject: "Science",
      focusSubject: "Maths",
    };

    for (const rule of MESSAGE_RULES) {
      for (const v of rule.messageVariants) {
        for (const banned of BANNED_WORDS) {
          expect(v.toLowerCase()).not.toContain(banned);
        }
      }
      for (const t of rule.tipVariants) {
        for (const banned of BANNED_WORDS) {
          expect(t.toLowerCase()).not.toContain(banned);
        }
      }
    }

    const res = generateStudentMessages(dummyCtx, "2026-11-21");
    for (const banned of BANNED_WORDS) {
      expect(res.friendlyMessage.toLowerCase()).not.toContain(banned);
      expect(res.focusTip.toLowerCase()).not.toContain(banned);
      for (const tip of res.tips) {
        expect(tip.toLowerCase()).not.toContain(banned);
      }
    }
  });

  it("selects #1 in LMS message when student has rank 1", () => {
    const ctx: MessageContext = {
      studentId: "student_1",
      name: "Tharaka",
      score: 95,
      displayScore: 95,
      attendanceScore: 100,
      rank: 1,
    };
    const res = generateStudentMessages(ctx, "2026-11-21");
    expect(res.friendlyMessage).toContain("#1 in LMS");
    expect(res.friendlyMessage).toContain("Tharaka");
  });

  it("selects top 10 message when student has rank 2-10", () => {
    const ctx: MessageContext = {
      studentId: "student_2",
      name: "Amantha",
      score: 88,
      displayScore: 88,
      attendanceScore: 90,
      rank: 4,
    };
    const res = generateStudentMessages(ctx, "2026-11-21");
    expect(res.friendlyMessage).toContain("#4 in LMS");
  });

  it("selects welcoming message for new students with no marks", () => {
    const ctx: MessageContext = {
      studentId: "student_new",
      name: "Kasun",
      score: null,
      displayScore: null,
      attendanceScore: null,
      isNewStudent: true,
    };
    const res = generateStudentMessages(ctx, "2026-11-21");
    expect(res.friendlyMessage).toContain("Welcome, Kasun!");
  });

  it("selects encouraging message for lower score bands without harsh words", () => {
    const ctx: MessageContext = {
      studentId: "student_low",
      name: "Nimal",
      score: 42,
      displayScore: 42,
      attendanceScore: 90,
      focusSubject: "Mathematics",
    };
    const res = generateStudentMessages(ctx, "2026-11-21");
    expect(res.friendlyMessage).toContain("Nimal");
    for (const banned of BANNED_WORDS) {
      expect(res.friendlyMessage.toLowerCase()).not.toContain(banned);
      expect(res.focusTip.toLowerCase()).not.toContain(banned);
    }
  });

  it("is deterministic for same date and changes on different dates", () => {
    const ctx: MessageContext = {
      studentId: "student_123",
      name: "Saman",
      score: 82,
      displayScore: 82,
      attendanceScore: 88,
    };
    const resDay1A = generateStudentMessages(ctx, "2026-11-21");
    const resDay1B = generateStudentMessages(ctx, "2026-11-21");
    expect(resDay1A.friendlyMessage).toBe(resDay1B.friendlyMessage);
    expect(resDay1A.focusTip).toBe(resDay1B.focusTip);
  });
});
