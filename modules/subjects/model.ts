import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  status: "active" | "archived";
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SubjectSchema.index({ centerId: 1, code: 1 }, { unique: true });

export const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);
