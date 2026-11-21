import { describe, it, expect } from "vitest";
import { canManageRole } from "../core/rbac/policies";

describe("RBAC Policies Unit Tests", () => {
  it("enforces strict hierarchy in role management", () => {
    // Super admin can manage admin, teacher, staff, student
    expect(canManageRole("super_admin", "admin")).toBe(true);
    expect(canManageRole("super_admin", "teacher")).toBe(true);
    expect(canManageRole("super_admin", "staff")).toBe(true);
    expect(canManageRole("super_admin", "student")).toBe(true);
    expect(canManageRole("super_admin", "super_admin")).toBe(false);

    // Admin can manage teacher, staff, student, but NOT admin or super_admin
    expect(canManageRole("admin", "teacher")).toBe(true);
    expect(canManageRole("admin", "staff")).toBe(true);
    expect(canManageRole("admin", "student")).toBe(true);
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("admin", "super_admin")).toBe(false);

    // Teacher can manage student and staff (for evaluator assignment), but NOT teacher or admin
    expect(canManageRole("teacher", "student")).toBe(true);
    expect(canManageRole("teacher", "staff")).toBe(true);
    expect(canManageRole("teacher", "teacher")).toBe(false);
    expect(canManageRole("teacher", "admin")).toBe(false);

    // Student cannot manage any role
    expect(canManageRole("student", "student")).toBe(false);
    expect(canManageRole("student", "staff")).toBe(false);
  });
});
