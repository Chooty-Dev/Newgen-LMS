import mongoose, { Schema, Document, Model } from "mongoose";

export type PerformanceGroup = "weak" | "medium" | "excellent";

export interface IPerformanceSnapshotEvent {
  date: string;
  description: string;
  type: string;
}

export interface IPerformanceSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD" daily date
  period?: string; // aligned with daily date or legacy week
  score: number | null; // 0-100 overall
  marksScore: number | null; // 0-100
  attendanceScore: number | null; // 0-100
  improvementScore?: number; // legacy optional
  group: PerformanceGroup;
  rankInClass?: number;
  countedAssessments?: number;
  countedSessions?: number;
  events?: IPerformanceSnapshotEvent[];
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceSnapshotSchema = new Schema<IPerformanceSnapshot>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    period: { type: String },
    score: { type: Number, default: null },
    marksScore: { type: Number, default: null },
    attendanceScore: { type: Number, default: null },
    improvementScore: { type: Number, default: 50 },
    group: {
      type: String,
      enum: ["weak", "medium", "excellent"],
      required: true,
      index: true,
    },
    rankInClass: { type: Number },
    countedAssessments: { type: Number, default: 0 },
    countedSessions: { type: Number, default: 0 },
    events: [
      {
        date: { type: String, required: true },
        description: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PerformanceSnapshotSchema.index({ studentId: 1, date: -1 }, { unique: true });
PerformanceSnapshotSchema.index({ studentId: 1, period: -1 });

export const PerformanceSnapshot: Model<IPerformanceSnapshot> =
  mongoose.models.PerformanceSnapshot ||
  mongoose.model<IPerformanceSnapshot>("PerformanceSnapshot", PerformanceSnapshotSchema);
