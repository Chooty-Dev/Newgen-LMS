import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClassScheduleRegular {
  daysOfWeek: number[]; // 0-6 (0=Sunday, 1=Monday, ...)
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  startDate?: Date;
  endDate?: Date;
}

export interface IClassScheduleSpecialSession {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "10:00"
  endTime: string; // "12:00"
}

export interface IClass extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  name: string;
  subjectId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  staffIds: mongoose.Types.ObjectId[];
  schedule: {
    type: "regular" | "special";
    regular?: IClassScheduleRegular;
    special?: {
      sessions: IClassScheduleSpecialSession[];
    };
  };
  capacity?: number;
  status: "active" | "paused" | "ended";
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    name: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    staffIds: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    schedule: {
      type: { type: String, enum: ["regular", "special"], required: true },
      regular: {
        daysOfWeek: [{ type: Number }],
        startTime: { type: String },
        endTime: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
      },
      special: {
        sessions: [
          {
            date: { type: String },
            startTime: { type: String },
            endTime: { type: String },
          },
        ],
      },
    },
    capacity: { type: Number, default: 50 },
    status: { type: String, enum: ["active", "paused", "ended"], default: "active", index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ClassSchema.index({ centerId: 1, status: 1 });

export const ClassModel: Model<IClass> =
  mongoose.models.Class || mongoose.model<IClass>("Class", ClassSchema);

// Enrollments
export interface IEnrollment extends Document {
  _id: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: "active" | "left";
  enrolledAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["active", "left"], default: "active", index: true },
    enrolledAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });
EnrollmentSchema.index({ studentId: 1, status: 1 });

export const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment || mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
