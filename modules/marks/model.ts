import mongoose, { Schema, Document, Model } from "mongoose";
import { AssessmentType } from "../exams/model";

export interface IMark extends Document {
  _id: mongoose.Types.ObjectId;
  assessmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  type: AssessmentType;
  score: number;
  totalMarks: number; // Snapshot of assessment total marks
  percentage: number;
  grade: string;
  attendanceStatus: "present" | "absent" | "excused";
  remarks?: string;
  status: "draft" | "submitted";
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema = new Schema<IMark>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    type: {
      type: String,
      enum: ["exam", "test", "mcq_quiz", "paper", "assignment"],
      required: true,
    },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: "F" },
    attendanceStatus: {
      type: String,
      enum: ["present", "absent", "excused"],
      default: "present",
    },
    remarks: { type: String, trim: true },
    status: { type: String, enum: ["draft", "submitted"], default: "draft", index: true },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

MarkSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });
MarkSchema.index({ studentId: 1, subjectId: 1, evaluatedAt: -1 });

export const Mark: Model<IMark> =
  mongoose.models.Mark || mongoose.model<IMark>("Mark", MarkSchema);
