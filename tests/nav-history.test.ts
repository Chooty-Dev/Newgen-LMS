import { describe, it, expect } from "vitest";
import {
  applyRouteVisit,
  consumeHistoryOnBack,
  resolveBackLabel,
  resolvePreviousUrl,
  sanitizeInternalPath,
} from "@/lib/nav-history";

describe("Navigation History & Exact Back Routing", () => {
  it("preserves exact tab query strings across transitions and returns to /students/student_30?tab=classes from /classes/...", () => {
    let history: string[] = [];

    // 1. User starts on Students list
    history = applyRouteVisit(history, "/students");
    // 2. Opens student_30 default overview tab
    history = applyRouteVisit(history, "/students/student_30");
    // 3. Switches tab via router.replace -> updates same pathname in place with ?tab=classes
    history = applyRouteVisit(history, "/students/student_30?tab=classes");
    expect(history).toEqual(["/students", "/students/student_30?tab=classes"]);

    // 4. Navigates from Classes tab to a specific class page
    history = applyRouteVisit(history, "/classes/grade-11-mathematics-4d1a");
    expect(history).toEqual([
      "/students",
      "/students/student_30?tab=classes",
      "/classes/grade-11-mathematics-4d1a",
    ]);

    // 5. Clicking Back on /classes/grade-11-mathematics-4d1a resolves to /students/student_30?tab=classes
    const classBackTarget = resolvePreviousUrl({
      history,
      currentUrl: "/classes/grade-11-mathematics-4d1a",
      fallbackHref: "/classes",
    });
    expect(classBackTarget).toBe("/students/student_30?tab=classes");
    expect(resolveBackLabel(classBackTarget, "Back to Classes", "/classes")).toBe("Back to Student");

    // 6. Popping class entry leaves student_30?tab=classes on top so next Back returns to /students
    history = consumeHistoryOnBack(history, "/classes/grade-11-mathematics-4d1a");
    expect(history).toEqual(["/students", "/students/student_30?tab=classes"]);

    const studentBackTarget = resolvePreviousUrl({
      history,
      currentUrl: "/students/student_30?tab=classes",
      fallbackHref: "/students",
    });
    expect(studentBackTarget).toBe("/students");
    expect(resolveBackLabel(studentBackTarget, "Back to Students", "/students")).toBe("Back to Students");
  });

  it("handles direct opens with fallbackHref, explicit ?from= overrides, browser native Back sync, and rejects external open redirects", () => {
    // Empty history falls back safely
    expect(
      resolvePreviousUrl({
        history: ["/classes/math-101"],
        currentUrl: "/classes/math-101",
        fallbackHref: "/classes",
      })
    ).toBe("/classes");

    // Explicit ?from= query param is honored when valid internal path
    expect(
      resolvePreviousUrl({
        history: ["/classes/math-101"],
        currentUrl: "/classes/math-101",
        explicitFrom: "/students/student_30?tab=classes",
        fallbackHref: "/classes",
      })
    ).toBe("/students/student_30?tab=classes");

    // External URLs / protocol-relative URLs are rejected
    expect(sanitizeInternalPath("https://evil.example/phish")).toBeNull();
    expect(sanitizeInternalPath("//evil.example/phish")).toBeNull();
    expect(
      resolvePreviousUrl({
        history: ["/classes/math-101"],
        currentUrl: "/classes/math-101",
        explicitFrom: "https://evil.example/phish",
        fallbackHref: "/classes",
      })
    ).toBe("/classes");

    // Browser native Back from child route pops cleanly instead of keeping loop
    let stack = ["/students/student_30?tab=classes", "/classes/math-101"];
    stack = applyRouteVisit(stack, "/students/student_30?tab=classes");
    expect(stack).toEqual(["/students/student_30?tab=classes"]);
  });
});
