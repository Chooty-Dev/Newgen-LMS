import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendanceSession extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  kind: "class" | "assessment";
  refId: mongoose.Types.ObjectId; // Class ID or Assessment ID
  date: string; // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  status: "open" | "finalized";
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    kind: { type: String, enum: ["class", "assessment"], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ["open", "finalized"], default: "open", index: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: "User" },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

AttendanceSessionSchema.index({ kind: 1, refId: 1, date: 1 }, { unique: true });

export const AttendanceSession: Model<IAttendanceSession> =
  mongoose.models.AttendanceSession ||
  mongoose.model<IAttendanceSession>("AttendanceSession", AttendanceSessionSchema);

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  assessmentId?: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  status: "present" | "absent" | "late" | "excused";
  source: "manual" | "nfc";
  markedBy: mongoose.Types.ObjectId;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment" },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "present",
      index: true,
    },
    source: { type: String, enum: ["manual", "nfc"], default: "manual" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ studentId: 1, date: -1 });
AttendanceSchema.index({ classId: 1, date: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
