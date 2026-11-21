import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().default("mongodb://localhost:27017/newgen_lms"),
  MONGODB_DB: z.string().default("newgen_lms"),
  APP_URL: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32).default("super_secret_session_key_at_least_32_characters_long_newgen"),
  JWT_SECRET: z.string().min(32).default("super_secret_jwt_key_at_least_32_characters_long_newgen"),
  CRON_SECRET: z.string().default("newgen_cron_secret_token_123456789"),
  SESSION_IDLE_MINUTES: z.coerce.number().default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().default(12),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_API_PER_MINUTE: z.coerce.number().default(120),
  BCRYPT_COST: z.coerce.number().default(12),
  SEED_DEFAULT_PASSWORD: z.string().default("Password123!"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse({
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  APP_URL: process.env.APP_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  SESSION_IDLE_MINUTES: process.env.SESSION_IDLE_MINUTES,
  SESSION_ABSOLUTE_HOURS: process.env.SESSION_ABSOLUTE_HOURS,
  LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES: process.env.LOGIN_LOCK_MINUTES,
  RATE_LIMIT_API_PER_MINUTE: process.env.RATE_LIMIT_API_PER_MINUTE,
  BCRYPT_COST: process.env.BCRYPT_COST,
  SEED_DEFAULT_PASSWORD: process.env.SEED_DEFAULT_PASSWORD,
  NODE_ENV: process.env.NODE_ENV,
});
