import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document<string> {
  _id: string; // jti
  userId: mongoose.Types.ObjectId;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
    revokedAt: { type: Date },
  },
  { _id: false, timestamps: false }
);

export const SessionModel: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
