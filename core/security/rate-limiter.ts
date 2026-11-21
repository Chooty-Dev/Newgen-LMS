import { RateLimitModel } from "./model";
import { connectDB } from "@/lib/db";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  await connectDB();

  const now = new Date();
  const expireAt = new Date(now.getTime() + windowSeconds * 1000);

  const doc = await RateLimitModel.findByIdAndUpdate(
    key,
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expireAt },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

  const currentCount = doc?.count || 1;
  const remaining = Math.max(0, limit - currentCount);
  const resetAt = doc?.expireAt || expireAt;

  return {
    success: currentCount <= limit,
    remaining,
    resetAt,
  };
}
