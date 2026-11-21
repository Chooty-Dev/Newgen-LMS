import mongoose from "mongoose";
import { env } from "@/core/config/env";

// Register all Mongoose models and schemas upfront to prevent MissingSchemaError during .populate()
import "@/modules/users/model";
import "@/modules/subjects/model";
import "@/modules/classes/model";
import "@/modules/exams/model";
import "@/modules/marks/model";
import "@/modules/attendance/model";
import "@/modules/analysis/model";
import "@/modules/announcements/model";
import "@/modules/centers/model";
import "@/modules/permissions/model";
import "@/modules/settings/model";
import "@/core/security/model";
import "@/core/auth/model";
import "@/core/audit/model";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer?: unknown;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = (async () => {
      try {
        const uri = env.MONGODB_URI;
        const timeout = process.env.NODE_ENV === "test" || process.env.VITEST ? 3000 : 10000;
        return await mongoose.connect(uri, {
          ...opts,
          serverSelectionTimeoutMS: timeout,
        });
      } catch (err) {
        console.warn(
          "Direct MongoDB connection failed. Initializing MongoDB Memory Server fallback...",
          (err as Error).message
        );
        // Fallback for local development and testing
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        cached.memoryServer = mongod;
        const memoryUri = mongod.getUri();
        return await mongoose.connect(memoryUri, opts);
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
