import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaderboardSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  syncedAt: Date;
  source: "cron" | "manual";
  triggeredBy?: mongoose.Types.ObjectId;
  isLatest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardSnapshotSchema = new Schema<ILeaderboardSnapshot>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    syncedAt: { type: Date, default: Date.now, index: true },
    source: { type: String, enum: ["cron", "manual"], default: "cron" },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    isLatest: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

LeaderboardSnapshotSchema.index({ centerId: 1, isLatest: 1 });

export const LeaderboardSnapshot: Model<ILeaderboardSnapshot> =
  mongoose.models.LeaderboardSnapshot ||
  mongoose.model<ILeaderboardSnapshot>("LeaderboardSnapshot", LeaderboardSnapshotSchema);

export interface ILeaderboardEntry extends Document {
  _id: mongoose.Types.ObjectId;
  snapshotId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  grade: string;
  rank: number;
  gradeRank: number;
  score: number;
  marksScore: number;
  attendanceScore: number;
  previousRank?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    snapshotId: { type: Schema.Types.ObjectId, ref: "LeaderboardSnapshot", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentName: { type: String, required: true },
    grade: { type: String, required: true, index: true },
    rank: { type: Number, required: true, index: true },
    gradeRank: { type: Number, required: true },
    score: { type: Number, required: true },
    marksScore: { type: Number, required: true },
    attendanceScore: { type: Number, required: true },
    previousRank: { type: Number },
  },
  { timestamps: true }
);

LeaderboardEntrySchema.index({ snapshotId: 1, rank: 1 });
LeaderboardEntrySchema.index({ snapshotId: 1, studentId: 1 }, { unique: true });
LeaderboardEntrySchema.index({ snapshotId: 1, grade: 1, gradeRank: 1 });

export const LeaderboardEntry: Model<ILeaderboardEntry> =
  mongoose.models.LeaderboardEntry ||
  mongoose.model<ILeaderboardEntry>("LeaderboardEntry", LeaderboardEntrySchema);

export interface IUserPreference extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lastCelebratedSyncId?: mongoose.Types.ObjectId;
  lastCelebratedRank?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    lastCelebratedSyncId: { type: Schema.Types.ObjectId, ref: "LeaderboardSnapshot" },
    lastCelebratedRank: { type: Number },
  },
  { timestamps: true }
);

export const UserPreference: Model<IUserPreference> =
  mongoose.models.UserPreference ||
  mongoose.model<IUserPreference>("UserPreference", UserPreferenceSchema);
