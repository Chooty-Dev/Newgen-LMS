import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole } from "@/core/rbac/permissions";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  assignedCenterIds?: mongoose.Types.ObjectId[];
  role: UserRole;
  username: string;
  email?: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  passwordHash: string;
  mustChangePassword: boolean;
  status: "active" | "disabled";
  lastLoginAt?: Date;
  failedLoginCount: number;
  lockUntil?: Date;
  permissionsVersion: number;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    assignedCenterIds: [{ type: Schema.Types.ObjectId, ref: "Center", default: [] }],
    role: {
      type: String,
      enum: ["super_admin", "admin", "teacher", "staff", "student"],
      required: true,
      index: true,
    },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    socialLinks: [{ platform: String, url: String }],
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
    lastLoginAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date },
    permissionsVersion: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

UserSchema.index({ centerId: 1, role: 1, status: 1 });
UserSchema.index({ name: "text" });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// Student Profile
export interface IStudentProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  admissionNo: string;
  grade?: string;
  dateOfBirth?: Date;
  guardian?: {
    name: string;
    phone: string;
    relation: string;
  };
  joinedAt: Date;
  nfcCardUid?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    admissionNo: { type: String, required: true, trim: true },
    grade: { type: String, trim: true },
    dateOfBirth: { type: Date },
    guardian: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    joinedAt: { type: Date, default: Date.now },
    nfcCardUid: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

StudentProfileSchema.index({ centerId: 1, admissionNo: 1 }, { unique: true });

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", StudentProfileSchema);

// Teacher Profile
export interface ITeacherProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  assignedCenterIds?: mongoose.Types.ObjectId[];
  title?: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    assignedCenterIds: [{ type: Schema.Types.ObjectId, ref: "Center", default: [] }],
    title: { type: String, default: "Instructor" },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TeacherProfile: Model<ITeacherProfile> =
  mongoose.models.TeacherProfile ||
  mongoose.model<ITeacherProfile>("TeacherProfile", TeacherProfileSchema);

// Staff Profile
export interface IStaffProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  title?: string;
  position?: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffProfileSchema = new Schema<IStaffProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    title: { type: String, default: "Staff Member" },
    position: { type: String, default: "Evaluator / Coordinator" },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const StaffProfile: Model<IStaffProfile> =
  mongoose.models.StaffProfile ||
  mongoose.model<IStaffProfile>("StaffProfile", StaffProfileSchema);
