import { SignJWT, jwtVerify } from "jose";
import { env } from "@/core/config/env";
import { SessionModel, ISession } from "./model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import crypto from "crypto";
import { cookies } from "next/headers";
import { UserRole } from "@/core/rbac/permissions";

const SECRET_KEY = new TextEncoder().encode(env.JWT_SECRET);
export const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-newgen_session" : "newgen_session";

export interface SessionPayload {
  jti: string; // Session ID
  sub: string; // User ID
  role: UserRole;
  centerId: string;
  username: string;
  name: string;
  permissionsVersion: number;
  mustChangePassword?: boolean;
}

export async function createSession(
  user: {
    _id: mongoose.Types.ObjectId;
    role: UserRole;
    centerId: mongoose.Types.ObjectId;
    username: string;
    name: string;
    permissionsVersion: number;
    mustChangePassword?: boolean;
  },
  ip = "unknown",
  userAgent = "unknown"
): Promise<{ token: string; jti: string; expiresAt: Date }> {
  await connectDB();

  const jti = crypto.randomUUID();
  const now = new Date();
  const idleMinutes = env.SESSION_IDLE_MINUTES;
  const expiresAt = new Date(now.getTime() + idleMinutes * 60 * 1000);

  // Create session record in MongoDB
  await SessionModel.create({
    _id: jti,
    userId: user._id,
    ip,
    userAgent,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
  });

  const payload: SessionPayload = {
    jti,
    sub: user._id.toString(),
    role: user.role,
    centerId: user.centerId.toString(),
    username: user.username,
    name: user.name,
    permissionsVersion: user.permissionsVersion,
    mustChangePassword: user.mustChangePassword,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_ABSOLUTE_HOURS}h`)
    .sign(SECRET_KEY);

  return { token, jti, expiresAt };
}

export async function updateSessionCenter(
  session: SessionPayload,
  newCenterId: string
): Promise<string> {
  const updatedPayload: SessionPayload = {
    ...session,
    centerId: newCenterId,
  };

  const token = await new SignJWT(updatedPayload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_ABSOLUTE_HOURS}h`)
    .sign(SECRET_KEY);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const sessionData = payload as unknown as SessionPayload;

    await connectDB();
    const sessionDoc = await SessionModel.findById(sessionData.jti).lean() as ISession | null;
    if (!sessionDoc || sessionDoc.revokedAt) {
      return null;
    }

    // Check idle expiration
    const now = new Date();
    if (sessionDoc.expiresAt.getTime() < now.getTime()) {
      return null;
    }

    // Sliding refresh: extend idle expiration by idleMinutes
    const newExpiresAt = new Date(now.getTime() + env.SESSION_IDLE_MINUTES * 60 * 1000);
    await SessionModel.updateOne(
      { _id: sessionData.jti },
      { lastActiveAt: now, expiresAt: newExpiresAt }
    );

    return sessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function revokeSession(jti: string): Promise<void> {
  await connectDB();
  await SessionModel.updateOne({ _id: jti }, { revokedAt: new Date() });
}

export async function revokeAllUserSessions(
  userId: string,
  exceptJti?: string
): Promise<void> {
  await connectDB();
  const query: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
    revokedAt: { $exists: false },
  };
  if (exceptJti) {
    query._id = { $ne: exceptJti };
  }
  await SessionModel.updateMany(query, { revokedAt: new Date() });
}
