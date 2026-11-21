import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true, index: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

SettingSchema.index({ centerId: 1, key: 1 }, { unique: true });

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
