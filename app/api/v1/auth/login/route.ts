import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { z } from "zod";
import { User, IUser } from "@/modules/users/model";
import { comparePassword } from "@/core/auth/password";
import { createSession, COOKIE_NAME } from "@/core/auth/session";
import { checkRateLimit } from "@/core/security/rate-limiter";
import { connectDB } from "@/lib/db";
import { env } from "@/core/config/env";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required").trim(),
  password: z.string().min(1, "Password is required"),
});

export const POST = defineRoute({
  requireAuth: false,
  bodySchema: loginSchema,
  handler: async ({ req, body, requestId }) => {
    await connectDB();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const cleanId = body.identifier.toLowerCase();

    // 1. IP + username rate limit (5 attempts per 15 mins)
    const rateCheck = await checkRateLimit({
      key: `login:${ip}:${cleanId}`,
      limit: env.LOGIN_MAX_ATTEMPTS,
      windowSeconds: env.LOGIN_LOCK_MINUTES * 60,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_LOCKED",
            message: `Too many failed login attempts. Please wait ${env.LOGIN_LOCK_MINUTES} minutes and try again.`,
          },
        },
        { status: 429 }
      );
    }

    // 2. Find user by username or email
    const user = await User.findOne({
      $or: [{ username: cleanId }, { email: cleanId }],
      deletedAt: null,
    }).select("+passwordHash");

    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Wrong username or password" } },
        { status: 401 }
      );
    }

    // 3. Check account status & lockUntil
    if (user.status === "disabled") {
      return NextResponse.json(
        { error: { code: "ACCOUNT_DISABLED", message: "Your account is disabled. Please contact your administrator." } },
        { status: 403 }
      );
    }

    const now = new Date();
    if (user.lockUntil && user.lockUntil.getTime() > now.getTime()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - now.getTime()) / (60 * 1000));
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_LOCKED",
            message: `Account temporarily locked due to failed attempts. Try again in ${minutesLeft} minutes.`,
          },
        },
        { status: 429 }
      );
    }

    // 4. Verify password
    const passwordValid = await comparePassword(body.password, user.passwordHash);

    if (!passwordValid) {
      const nextFailCount = (user.failedLoginCount || 0) + 1;
      const updateData: Partial<IUser> = { failedLoginCount: nextFailCount };

      if (nextFailCount >= env.LOGIN_MAX_ATTEMPTS) {
        updateData.lockUntil = new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60 * 1000);
      }

      await User.updateOne({ _id: user._id }, updateData);

      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Wrong username or password" } },
        { status: 401 }
      );
    }

    // 5. Successful Login: reset counters
    await User.updateOne(
      { _id: user._id },
      { failedLoginCount: 0, lockUntil: null, lastLoginAt: now }
    );

    // 6. Create session
    const { token, maxAge } = await createSession(user, ip, userAgent);

    const response = NextResponse.json({
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
        requestId,
      },
    });

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

    return response;
  },
});
