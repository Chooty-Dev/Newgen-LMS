import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  audience: "center" | "classes";
  classIds: mongoose.Types.ObjectId[];
  publishAt: Date;
  expiresAt?: Date;
  pinned: boolean;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ["center", "classes"], default: "center", index: true },
    classIds: [{ type: Schema.Types.ObjectId, ref: "Class" }],
    publishAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    pinned: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
