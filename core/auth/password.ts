import bcrypt from "bcryptjs";
import { env } from "@/core/config/env";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(env.BCRYPT_COST);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(): string {
  // Generate random 12-character strong password (letters, digits, symbol)
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = crypto.randomBytes(12);
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function validatePasswordStrength(password: string, username?: string): { valid: boolean; message?: string } {
  if (password.length < 10) {
    return { valid: false, message: "Password must be at least 10 characters long" };
  }
  if (username && password.toLowerCase() === username.toLowerCase()) {
    return { valid: false, message: "Password cannot be identical to your username" };
  }
  return { valid: true };
}
