import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  singletonKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    singletonKey: {
      type: String,
      unique: true,
      default: 'singleton',
    },
  },
  { timestamps: true }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);