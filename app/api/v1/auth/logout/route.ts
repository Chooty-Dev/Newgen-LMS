import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { revokeSession, COOKIE_NAME } from "@/core/auth/session";

export const POST = defineRoute({
  requireAuth: false,
  handler: async ({ session }) => {
    if (session?.jti) {
      await revokeSession(session.jti);
    }

    const response = NextResponse.json({ data: { success: true } });
    const cookieNames = [COOKIE_NAME, "newgen_session", "__Host-newgen_session"];
    for (const name of cookieNames) {
      response.cookies.set({
        name,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });
    }

    return response;
  },
});
