import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICenter extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
  timezone: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CenterSchema = new Schema<ICenter>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    timezone: { type: String, default: "Asia/Colombo" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Center: Model<ICenter> =
  mongoose.models.Center || mongoose.model<ICenter>("Center", CenterSchema);
