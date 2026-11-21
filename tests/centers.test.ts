import { describe, it, expect } from "vitest";
import { resolveEffectivePermissions } from "../core/rbac/resolver";
import { ALL_PERMISSIONS } from "../core/rbac/permissions";
import { CentersService } from "../modules/centers/service";

describe("Super Admin & Centers Management Tests", () => {
  it("confirms Super Admin unconditionally has every single permission in the system", async () => {
    const permissions = await resolveEffectivePermissions("super-admin-id", "super_admin", 1);
    expect(permissions).toEqual(ALL_PERMISSIONS);
    expect(permissions).toContain("centers.view");
    expect(permissions).toContain("centers.create");
    expect(permissions).toContain("centers.update");
    expect(permissions).toContain("centers.delete");
    expect(permissions).toContain("admins.view");
    expect(permissions).toContain("permissions.manage");
    expect(permissions).toContain("security.manage");
    expect(permissions).toContain("audit.view");
  });

  it("creates, lists, updates, and protects education centers", async () => {
    // 1. List centers (auto-seeds default if empty)
    const initialCenters = await CentersService.listCenters();
    expect(initialCenters.length).toBeGreaterThanOrEqual(1);

    // 2. Create a new center
    const newCenter = await CentersService.createCenter({
      name: "Galle Branch Campus",
      address: "42 Light House Street, Galle Fort",
      phone: "+94 91 223 4567",
      timezone: "Asia/Colombo",
    });
    expect(newCenter._id).toBeDefined();
    expect(newCenter.name).toBe("Galle Branch Campus");

    // 3. List should include the newly created center
    const afterCreate = await CentersService.listCenters();
    expect(afterCreate.some((c) => c._id.toString() === newCenter._id.toString())).toBe(true);

    // 4. Update the center
    const updated = await CentersService.updateCenter(newCenter._id.toString(), {
      name: "Galle Main Campus",
      phone: "+94 91 999 8888",
    });
    expect(updated.name).toBe("Galle Main Campus");
    expect(updated.phone).toBe("+94 91 999 8888");

    // 5. Delete the created center
    await CentersService.deleteCenter(newCenter._id.toString());
    const afterDelete = await CentersService.listCenters();
    expect(afterDelete.some((c) => c._id.toString() === newCenter._id.toString())).toBe(false);
  });
});
