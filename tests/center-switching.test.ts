import { describe, it, expect, beforeAll } from "vitest";
import { connectDB } from "@/lib/db";
import { Center } from "@/modules/centers/model";
import { CentersService } from "@/modules/centers/service";
import { User, TeacherProfile, StudentProfile } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { AnalysisService } from "@/modules/analysis/service";
import mongoose from "mongoose";

describe("Center Management & Teacher Center Switching", () => {
  beforeAll(async () => {
    await connectDB();
  });

  it("allows creating and deleting centers cleanly without count restrictions", async () => {
    const centerA = await CentersService.createCenter({
      name: "Test Center A",
      address: "Colombo",
    });
    const centerB = await CentersService.createCenter({
      name: "Test Center B",
      address: "Kandy",
    });

    expect(centerA._id).toBeDefined();
    expect(centerB._id).toBeDefined();

    // Deleting center B should succeed
    await CentersService.deleteCenter(centerB._id.toString());
    const foundB = await Center.findById(centerB._id);
    expect(foundB).toBeNull();
  });

  it("supports assigning a teacher to multiple centers and filtering", async () => {
    const c1 = await Center.create({ name: "Center Alpha", timezone: "Asia/Colombo" });
    const c2 = await Center.create({ name: "Center Beta", timezone: "Asia/Colombo" });

    const username = `teach_${Date.now()}`;
    const { user } = await UserService.createUser(
      { id: new mongoose.Types.ObjectId().toString(), role: "super_admin", centerId: c1._id.toString() },
      {
        name: "Multi-Center Teacher",
        username,
        email: `${username}@test.lk`,
        role: "teacher",
        centerIds: [c1._id.toString(), c2._id.toString()],
      }
    );

    expect(user.assignedCenterIds).toBeDefined();
    expect(user.assignedCenterIds?.length).toBe(2);

    // List teachers in Center Alpha
    const alphaTeachers = await UserService.listTeachers({
      page: 1,
      limit: 10,
      centerId: c1._id.toString(),
    });
    expect(alphaTeachers.data.some((t) => t.id === user._id.toString())).toBe(true);

    // List teachers in Center Beta
    const betaTeachers = await UserService.listTeachers({
      page: 1,
      limit: 10,
      centerId: c2._id.toString(),
    });
    expect(betaTeachers.data.some((t) => t.id === user._id.toString())).toBe(true);

    // Clean up
    await User.findByIdAndDelete(user._id);
    await TeacherProfile.deleteOne({ userId: user._id });
    await Center.findByIdAndDelete(c1._id);
    await Center.findByIdAndDelete(c2._id);
  });

  it("supports manual custom temporary passwords when creating users", async () => {
    const center = await Center.create({ name: "Center Password Test", timezone: "Asia/Colombo" });
    const customPass = "TeacherPass#2026!";

    const username = `custom_pwd_${Date.now()}`;
    const { user, temporaryPassword } = await UserService.createUser(
      { id: new mongoose.Types.ObjectId().toString(), role: "super_admin", centerId: center._id.toString() },
      {
        name: "Custom Password Teacher",
        username,
        email: `${username}@test.lk`,
        password: customPass,
        role: "teacher",
      }
    );

    expect(temporaryPassword).toBe(customPass);
    expect(user.mustChangePassword).toBe(true);

    // Clean up
    await User.findByIdAndDelete(user._id);
    await TeacherProfile.deleteOne({ userId: user._id });
    await Center.findByIdAndDelete(center._id);
  });

  it("scopes teacher analytics strictly to the active centerId", async () => {
    const center1 = await Center.create({ name: "Analytics Center 1", timezone: "Asia/Colombo" });
    const center2 = await Center.create({ name: "Analytics Center 2", timezone: "Asia/Colombo" });

    const u1 = `st_c1_${Date.now()}`;
    const { user: student1 } = await UserService.createUser(
      { id: new mongoose.Types.ObjectId().toString(), role: "super_admin", centerId: center1._id.toString() },
      {
        name: "Student in Center 1",
        username: u1,
        email: `${u1}@test.lk`,
        role: "student",
      }
    );

    const u2 = `st_c2_${Date.now()}`;
    const { user: student2 } = await UserService.createUser(
      { id: new mongoose.Types.ObjectId().toString(), role: "super_admin", centerId: center2._id.toString() },
      {
        name: "Student in Center 2",
        username: u2,
        email: `${u2}@test.lk`,
        role: "student",
      }
    );

    const c1Analytics = await AnalysisService.getTeacherAnalytics(center1._id.toString());
    const c2Analytics = await AnalysisService.getTeacherAnalytics(center2._id.toString());

    // Center 1 analytics should contain student 1, not student 2
    expect(c1Analytics.topStudents.some((s) => s.id === student1._id.toString())).toBe(true);
    expect(c1Analytics.topStudents.some((s) => s.id === student2._id.toString())).toBe(false);

    // Center 2 analytics should contain student 2, not student 1
    expect(c2Analytics.topStudents.some((s) => s.id === student2._id.toString())).toBe(true);
    expect(c2Analytics.topStudents.some((s) => s.id === student1._id.toString())).toBe(false);

    // Clean up
    await User.findByIdAndDelete(student1._id);
    await StudentProfile.deleteOne({ userId: student1._id });
    await User.findByIdAndDelete(student2._id);
    await StudentProfile.deleteOne({ userId: student2._id });
    await Center.findByIdAndDelete(center1._id);
    await Center.findByIdAndDelete(center2._id);
  });

  it("ensures all centers are listed and accessible for both admin and super_admin", async () => {
    const cA = await CentersService.createCenter({ name: "Center Global A" });
    const cB = await CentersService.createCenter({ name: "Center Global B" });

    const all = await CentersService.listCenters();
    expect(all.some((c) => c._id.toString() === cA._id.toString())).toBe(true);
    expect(all.some((c) => c._id.toString() === cB._id.toString())).toBe(true);

    // Clean up
    await CentersService.deleteCenter(cA._id.toString());
    await CentersService.deleteCenter(cB._id.toString());
  });
});
