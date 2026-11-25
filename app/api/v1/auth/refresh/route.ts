import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { COOKIE_NAME } from "@/core/auth/session";
import { env } from "@/core/config/env";

export const POST = defineRoute({
  requireAuth: true,
  handler: async ({ session, req }) => {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const response = NextResponse.json({
      data: { active: true, user: session?.username },
    });

    if (token) {
      const maxAge = env.SESSION_ABSOLUTE_HOURS * 3600;
      response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge,
        expires: new Date(Date.now() + maxAge * 1000),
        path: "/",
      });
    }

    return response;
  },
});
