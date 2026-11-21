import mongoose, { Schema, Document, Model } from "mongoose";

export type AssessmentType = "exam" | "test" | "mcq_quiz" | "paper" | "assignment";
export type AssessmentStatus = "draft" | "scheduled" | "ongoing" | "waiting_marks" | "completed";

export interface IAssessmentSession {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  endTime: string; // "11:00"
}

export interface IAssessment extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  title: string;
  type: AssessmentType;
  subjectId: mongoose.Types.ObjectId;
  classIds: mongoose.Types.ObjectId[];
  totalMarks: number;
  passMark: number;
  weight: number; // e.g. 1.0, 1.5, 2.0
  dateMode: "single" | "multiple";
  sessions: IAssessmentSession[];
  evaluatorIds: mongoose.Types.ObjectId[]; // Staff users assigned to evaluate
  status: AssessmentStatus;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["exam", "test", "mcq_quiz", "paper", "assignment"],
      required: true,
      index: true,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    classIds: [{ type: Schema.Types.ObjectId, ref: "Class", index: true }],
    totalMarks: { type: Number, required: true, default: 100 },
    passMark: { type: Number, required: true, default: 40 },
    weight: { type: Number, default: 1.0 },
    dateMode: { type: String, enum: ["single", "multiple"], default: "single" },
    sessions: [
      {
        date: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    evaluatorIds: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    status: {
      type: String,
      enum: ["draft", "scheduled", "ongoing", "waiting_marks", "completed"],
      default: "scheduled",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AssessmentSchema.index({ subjectId: 1, type: 1 });
AssessmentSchema.index({ "sessions.date": 1 });

export const Assessment: Model<IAssessment> =
  mongoose.models.Assessment ||
  mongoose.model<IAssessment>("Assessment", AssessmentSchema);
