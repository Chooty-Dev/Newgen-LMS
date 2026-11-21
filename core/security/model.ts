import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimit extends Document<string> {
  _id: string; // key
  count: number;
  windowStart: Date;
  expireAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
    expireAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  { _id: false, timestamps: false }
);

export const RateLimitModel: Model<IRateLimit> =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
