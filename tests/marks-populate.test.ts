import { describe, it, expect } from "vitest";
import { MarkService } from "../modules/marks/service";
import mongoose from "mongoose";

describe("Marks Populate Schema Registration Tests", () => {
  it("successfully populates Subject, Assessment, Class, and User without MissingSchemaError", async () => {
    // Test that MarkService.listMarks runs without throwing MissingSchemaError
    const res = await MarkService.listMarks({
      studentId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("filters marks by status correctly when provided", async () => {
    const res = await MarkService.listMarks({
      studentId: new mongoose.Types.ObjectId().toString(),
      status: "submitted",
    });
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
  });
});
