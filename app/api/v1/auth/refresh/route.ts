import { defineRoute } from "@/core/http/defineRoute";

export const POST = defineRoute({
  requireAuth: true,
  handler: async ({ session }) => {
    return { data: { active: true, user: session?.username } };
  },
});
