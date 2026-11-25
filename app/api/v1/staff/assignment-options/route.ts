import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { getCachedStaffAssignmentOptions } from "@/modules/users/staff-assignment-cache";

export const GET = defineRoute({
  permission: ["staff.view", "staff.create", "staff.update"],
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 }
      );
    }

    const result = await getCachedStaffAssignmentOptions({
      centerId: session.centerId || "",
      teacherId: session.role === "teacher" ? session.sub : undefined,
    });

    return {
      data: result.data,
      meta: { cacheHit: result.cacheHit },
    };
  },
});
