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

export interface IStudentTeacherInsight extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  dataFingerprint: string;
  report: {
    source: "gemini" | "fallback";
    modelUsed?: string;
    fallbackReason?: string;
    generatedAt: string;
    headline: string;
    plusPoints: string[];
    weakPoints: string[];
    howToImproveOrSustain: string[];
    futureOutlook: {
      trajectory: "rising" | "steady" | "at_risk";
      prediction: string;
      targetScoreEstimate: number;
    };
    attendanceInsight: string;
    marksInsight: string;
  };
  generatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentTeacherInsightSchema = new Schema<IStudentTeacherInsight>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    dataFingerprint: { type: String, required: true },
    report: {
      source: { type: String, enum: ["gemini", "fallback"], required: true },
      modelUsed: { type: String },
      fallbackReason: { type: String },
      generatedAt: { type: String, required: true },
      headline: { type: String, required: true },
      plusPoints: [{ type: String }],
      weakPoints: [{ type: String }],
      howToImproveOrSustain: [{ type: String }],
      futureOutlook: {
        trajectory: { type: String, enum: ["rising", "steady", "at_risk"], required: true },
        prediction: { type: String, required: true },
        targetScoreEstimate: { type: Number, required: true },
      },
      attendanceInsight: { type: String, required: true },
      marksInsight: { type: String, required: true },
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const StudentTeacherInsight: Model<IStudentTeacherInsight> =
  mongoose.models.StudentTeacherInsight ||
  mongoose.model<IStudentTeacherInsight>("StudentTeacherInsight", StudentTeacherInsightSchema);

export interface ITeacherInsightQuota extends Document {
  _id: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  refreshTimestamps: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const TeacherInsightQuotaSchema = new Schema<ITeacherInsightQuota>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshTimestamps: [{ type: Date }],
  },
  { timestamps: true }
);

TeacherInsightQuotaSchema.index({ actorId: 1, studentId: 1 }, { unique: true });

export const TeacherInsightQuota: Model<ITeacherInsightQuota> =
  mongoose.models.TeacherInsightQuota ||
  mongoose.model<ITeacherInsightQuota>("TeacherInsightQuota", TeacherInsightQuotaSchema);

export interface IInsightRefreshLimit extends Document {
  _id: mongoose.Types.ObjectId;
  scopeKey: string;
  refreshTimestamps: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const InsightRefreshLimitSchema = new Schema<IInsightRefreshLimit>(
  {
    scopeKey: { type: String, required: true, unique: true, index: true },
    refreshTimestamps: [{ type: Date }],
  },
  { timestamps: true }
);

export const InsightRefreshLimit: Model<IInsightRefreshLimit> =
  mongoose.models.InsightRefreshLimit ||
  mongoose.model<IInsightRefreshLimit>("InsightRefreshLimit", InsightRefreshLimitSchema);
