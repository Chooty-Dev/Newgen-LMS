import { describe, it, expect } from "vitest";
import { resolveEffectivePermissions } from "../core/rbac/resolver";
import { ALL_PERMISSIONS, SUPER_ADMIN_EXCLUSIVE } from "../core/rbac/permissions";
import { ROLE_DEFAULT_PERMISSIONS } from "../core/rbac/defaults";

describe("RBAC Resolver Unit Tests", () => {
  it("unconditionally grants ALL_PERMISSIONS to super_admin", async () => {
    const permissions = await resolveEffectivePermissions("super-admin-id", "super_admin", 1);
    expect(permissions).toEqual(ALL_PERMISSIONS);
    expect(permissions.length).toBe(ALL_PERMISSIONS.length);
  });

  it("never grants super_admin exclusive permissions to regular roles", async () => {
    const studentPerms = await resolveEffectivePermissions("student-id", "student", 1);
    for (const exclusive of SUPER_ADMIN_EXCLUSIVE) {
      expect(studentPerms).not.toContain(exclusive);
    }

    const teacherPerms = await resolveEffectivePermissions("teacher-id", "teacher", 1);
    for (const exclusive of SUPER_ADMIN_EXCLUSIVE) {
      expect(teacherPerms).not.toContain(exclusive);
    }
  });

  it("resolves default role permissions for student and staff", async () => {
    const studentDefaults = ROLE_DEFAULT_PERMISSIONS.student;
    expect(studentDefaults).toContain("dashboard.view");
    expect(studentDefaults).toContain("marks.viewOwn");
    expect(studentDefaults).toContain("analysis.viewOwn");
    expect(studentDefaults).not.toContain("students.create");
  });
});
