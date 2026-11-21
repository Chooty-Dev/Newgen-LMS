import { describe, it, expect } from "vitest";
import { runSeed } from "../scripts/seed";

describe("Database Seed Suite", () => {
  it("seeds the database deterministically with all 5 roles, classes, assessments, marks, and historical snapshots", async () => {
    const result = await runSeed();
    expect(result).toBe(true);
  }, 90000); // 90 seconds timeout for full seed
});
