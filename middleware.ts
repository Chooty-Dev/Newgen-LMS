import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/v1/auth/login", "/api/v1/auth/logout", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and internal next paths pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookieName =
    process.env.NODE_ENV === "production" ? "__Host-newgen_session" : "newgen_session";
  const token = req.cookies.get(cookieName)?.value;

  let sessionPayload: { mustChangePassword?: boolean } | null = null;
  if (token && process.env.JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      sessionPayload = payload as { mustChangePassword?: boolean };
    } catch {
      sessionPayload = null;
    }
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  // Unauthenticated user attempting to access private route
  if (!sessionPayload && !isPublic && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user attempting to access /login
  if (sessionPayload && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Forced password change check
  if (
    sessionPayload &&
    sessionPayload.mustChangePassword &&
    pathname !== "/change-password" &&
    !pathname.startsWith("/api/")
  ) {
    const changePassUrl = new URL("/change-password", req.url);
    return NextResponse.redirect(changePassUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
